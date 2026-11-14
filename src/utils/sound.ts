import { AlarmSoundId, JujitsuSoundId } from './time';

let sharedAudioCtx: AudioContext | null = null;
let sharedTickNoiseBuffer: AudioBuffer | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeTimers: number[] = [];
let activeAlarmMasterGain: GainNode | null = null;
let alarmLoopIntervalId: number | null = null;
let alarmLoopTimeoutId: number | null = null;

export const GRADUAL_ALARM_RAMP_MS = 30_000;
export const GRADUAL_ALARM_MIN_SCALE = 0.05;

export function computeGradualVolumeScale(
  elapsedMs: number,
  rampDurationMs: number = GRADUAL_ALARM_RAMP_MS,
  minScale: number = GRADUAL_ALARM_MIN_SCALE
): number {
  const clampedMin = Math.min(1, Math.max(0.01, minScale));
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return clampedMin;
  }
  if (!Number.isFinite(rampDurationMs) || rampDurationMs <= 0 || elapsedMs >= rampDurationMs) {
    return 1;
  }
  const progress = elapsedMs / rampDurationMs;
  return clampedMin + (1 - clampedMin) * progress;
}

export type VibrationKind = 'phase' | 'complete';

export interface VibrateCapableNavigator {
  vibrate?: (pattern: number | number[]) => boolean;
}

export function getVibrationPattern(kind: VibrationKind): number[] {
  if (kind === 'phase') {
    return [160, 80, 160];
  }
  return [250, 100, 250, 100, 400];
}

export function triggerVibration(
  enabled: boolean,
  kind: VibrationKind,
  navOverride?: VibrateCapableNavigator | null
): boolean {
  if (!enabled) return false;
  const nav: VibrateCapableNavigator | null =
    navOverride !== undefined
      ? navOverride
      : typeof navigator !== 'undefined'
        ? (navigator as VibrateCapableNavigator)
        : null;
  if (!nav || typeof nav.vibrate !== 'function') return false;
  try {
    return Boolean(nav.vibrate(getVibrationPattern(kind)));
  } catch {
    return false;
  }
}

export function stopVibration(navOverride?: VibrateCapableNavigator | null): void {
  const nav: VibrateCapableNavigator | null =
    navOverride !== undefined
      ? navOverride
      : typeof navigator !== 'undefined'
        ? (navigator as VibrateCapableNavigator)
        : null;
  if (!nav || typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(0);
  } catch {
    // Ignore unsupported vibration cancellation
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtxClass();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function clearSingleShotAudio(): void {
  for (const timerId of activeTimers) {
    window.clearTimeout(timerId);
  }
  activeTimers = [];

  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Oscillator may have already completed
    }
  }
  activeOscillators = [];
}

export function stopAlarmSound(): void {
  if (typeof window !== 'undefined') {
    if (alarmLoopIntervalId !== null) {
      window.clearInterval(alarmLoopIntervalId);
      alarmLoopIntervalId = null;
    }
    if (alarmLoopTimeoutId !== null) {
      window.clearTimeout(alarmLoopTimeoutId);
      alarmLoopTimeoutId = null;
    }
    clearSingleShotAudio();
    if (activeAlarmMasterGain) {
      try {
        activeAlarmMasterGain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      activeAlarmMasterGain = null;
    }
  }
  stopVibration();
}

export interface ToneNote {
  freq: number;
  offsetMs: number;
  durationMs: number;
  type?: OscillatorType;
  peakGain?: number;
}

export function getAlarmToneSequence(soundId: AlarmSoundId): ToneNote[] {
  switch (soundId) {
    case AlarmSoundId.ArcadeChiptune: {
      // Crisp 8-bit square-wave ascending arpeggio fanfare (2 phrases)
      const phraseOffsets = [0, 820];
      const melody: readonly { freq: number; offset: number; dur: number }[] = [
        { freq: 523.25, offset: 0, dur: 90 },   // C5
        { freq: 659.25, offset: 105, dur: 90 }, // E5
        { freq: 783.99, offset: 210, dur: 90 }, // G5
        { freq: 1046.5, offset: 315, dur: 170 }, // C6
        { freq: 783.99, offset: 505, dur: 85 }, // G5
        { freq: 1046.5, offset: 605, dur: 190 }, // C6
      ];
      const notes: ToneNote[] = [];
      for (const base of phraseOffsets) {
        for (const step of melody) {
          notes.push({
            freq: step.freq,
            offsetMs: base + step.offset,
            durationMs: step.dur,
            type: 'square',
            peakGain: 0.11,
          });
        }
      }
      return notes;
    }

    case AlarmSoundId.RetroPager: {
      // Classic dual-tone high-contrast pocket pager alert (G6 <-> C7)
      const burstOffsets = [0, 660, 1320];
      const notes: ToneNote[] = [];
      for (const burst of burstOffsets) {
        notes.push(
          { freq: 1567.98, offsetMs: burst, durationMs: 110, type: 'square', peakGain: 0.11 },
          { freq: 2093.0, offsetMs: burst + 125, durationMs: 110, type: 'square', peakGain: 0.11 },
          { freq: 1567.98, offsetMs: burst + 250, durationMs: 110, type: 'square', peakGain: 0.11 },
          { freq: 2093.0, offsetMs: burst + 375, durationMs: 145, type: 'square', peakGain: 0.11 }
        );
      }
      return notes;
    }

    case AlarmSoundId.SynthPulse: {
      // Warm 1980s sawtooth/triangle octave wakeup sequence (A4 -> E5 -> A5 -> C#6 -> E6)
      const phraseOffsets = [0, 920];
      const notes: ToneNote[] = [];
      for (const base of phraseOffsets) {
        notes.push(
          { freq: 440.0, offsetMs: base, durationMs: 130, type: 'sawtooth', peakGain: 0.1 },
          { freq: 659.25, offsetMs: base + 145, durationMs: 130, type: 'sawtooth', peakGain: 0.1 },
          { freq: 880.0, offsetMs: base + 290, durationMs: 130, type: 'triangle', peakGain: 0.15 },
          { freq: 1108.73, offsetMs: base + 435, durationMs: 140, type: 'sawtooth', peakGain: 0.1 },
          { freq: 1318.51, offsetMs: base + 590, durationMs: 240, type: 'triangle', peakGain: 0.15 }
        );
      }
      return notes;
    }

    case AlarmSoundId.CasioPiezo:
    default: {
      // Classic 1980s Timex / Casio 4-pulse C7 piezo quartz watch crystal alarm
      const burstOffsets = [0, 680, 1360];
      const pulseOffsets = [0, 95, 190, 285];
      const notes: ToneNote[] = [];
      for (const burst of burstOffsets) {
        for (const pulse of pulseOffsets) {
          notes.push({
            freq: 2093,
            offsetMs: burst + pulse,
            durationMs: 62,
            type: 'square',
            peakGain: 0.11,
          });
        }
      }
      return notes;
    }
  }
}

function playSequence(
  notes: readonly ToneNote[],
  destinationOverride?: AudioNode | null
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const targetDestination = destinationOverride ?? ctx.destination;

  for (const note of notes) {
    const timerId = window.setTimeout(() => {
      try {
        const now = ctx.currentTime;
        const durationSec = note.durationMs / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = note.type ?? 'square';
        osc.frequency.setValueAtTime(note.freq, now);

        const peak = note.peakGain ?? 0.12;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
        gain.gain.setValueAtTime(peak, Math.max(now + 0.01, now + durationSec - 0.018));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        osc.connect(gain);
        gain.connect(targetDestination);

        activeOscillators.push(osc);
        osc.onended = () => {
          activeOscillators = activeOscillators.filter((item) => item !== osc);
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            // Ignore cleanup errors
          }
        };

        osc.start(now);
        osc.stop(now + durationSec + 0.01);
      } catch {
        // Ignore audio scheduling errors in restricted environments
      }
    }, note.offsetMs);

    activeTimers.push(timerId);
  }
}

/**
 * Plays the selected retro alarm tone sequence when a Countdown, Interval, or Focus Session completes.
 * When gradualVolume is enabled, loops and fades in smoothly over 30 seconds until dismissed.
 */
export function playCompletionAlarm(
  enabled: boolean,
  soundId: AlarmSoundId = AlarmSoundId.CasioPiezo,
  gradualVolume: boolean = false
): void {
  if (!enabled) {
    clearSingleShotAudio();
    return;
  }

  if (gradualVolume) {
    startLoopingAlarm({
      soundEnabled: true,
      soundId,
      vibrationEnabled: false,
      gradualVolume: true,
    });
    return;
  }

  stopAlarmSound();
  playSequence(getAlarmToneSequence(soundId));
}

/**
 * Loops the selected retro alarm tone and haptic vibration for the bedside Alarm Clock
 * (or gradual-fade timer completion) until dismissed, snoozed, or automatically capped after 60 seconds.
 */
export function startLoopingAlarm(params: {
  soundEnabled: boolean;
  soundId: AlarmSoundId;
  vibrationEnabled: boolean;
  gradualVolume?: boolean;
  onAutoStop?: () => void;
}): void {
  stopAlarmSound();

  let masterGain: GainNode | null = null;
  if (params.soundEnabled) {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      try {
        masterGain = ctx.createGain();
        const now = ctx.currentTime;
        if (params.gradualVolume) {
          masterGain.gain.setValueAtTime(GRADUAL_ALARM_MIN_SCALE, now);
          masterGain.gain.linearRampToValueAtTime(
            1.0,
            now + GRADUAL_ALARM_RAMP_MS / 1000
          );
        } else {
          masterGain.gain.setValueAtTime(1.0, now);
        }
        masterGain.connect(ctx.destination);
        activeAlarmMasterGain = masterGain;
      } catch {
        masterGain = null;
      }
    }
  }

  const fireCycle = () => {
    if (params.soundEnabled) {
      clearSingleShotAudio();
      playSequence(getAlarmToneSequence(params.soundId), masterGain);
    }
    if (params.vibrationEnabled) {
      triggerVibration(true, 'complete');
    }
  };

  fireCycle();

  if (typeof window !== 'undefined') {
    alarmLoopIntervalId = window.setInterval(fireCycle, 2400);
    alarmLoopTimeoutId = window.setTimeout(() => {
      stopAlarmSound();
      params.onAutoStop?.();
    }, 60_000);
  }
}

/**
 * Ascending crisp 2-tone alert signaling start of a WORK interval.
 */
export function playWorkStartCue(enabled: boolean): void {
  clearSingleShotAudio();
  if (!enabled) return;

  playSequence([
    { freq: 880, offsetMs: 0, durationMs: 90, type: 'triangle', peakGain: 0.16 },
    { freq: 1318.5, offsetMs: 115, durationMs: 150, type: 'square', peakGain: 0.11 },
  ]);
}

/**
 * Descending 2-tone alert signaling start of a REST interval.
 */
export function playRestStartCue(enabled: boolean): void {
  clearSingleShotAudio();
  if (!enabled) return;

  playSequence([
    { freq: 1046.5, offsetMs: 0, durationMs: 90, type: 'triangle', peakGain: 0.15 },
    { freq: 659.25, offsetMs: 115, durationMs: 160, type: 'triangle', peakGain: 0.16 },
  ]);
}

export interface TickTockParams {
  isTock: boolean;
  centerFreqHz: number;
  bodyFreqHz: number;
  peakGain: number;
}

export function getTickTockParams(second: number): TickTockParams {
  const normalizedSec = Math.abs(Math.floor(second)) % 60;
  const isTock = normalizedSec % 2 === 1;
  if (isTock) {
    return {
      isTock: true,
      centerFreqHz: 1680,
      bodyFreqHz: 840,
      peakGain: 0.026,
    };
  }
  return {
    isTock: false,
    centerFreqHz: 2350,
    bodyFreqHz: 1180,
    peakGain: 0.032,
  };
}

function getTickNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedTickNoiseBuffer && sharedTickNoiseBuffer.sampleRate === ctx.sampleRate) {
    return sharedTickNoiseBuffer;
  }
  const frameCount = Math.max(64, Math.floor(ctx.sampleRate * 0.014));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    const decay = Math.exp(-i / (frameCount * 0.24));
    channel[i] = (Math.random() * 2 - 1) * decay;
  }
  sharedTickNoiseBuffer = buffer;
  return buffer;
}

/**
 * Plays a low-volume, authentic 1980s mechanical quartz escapement tick/tock click
 * synchronized to the Live Clock second transition.
 */
export function playMechanicalTickTock(enabled: boolean, second: number): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const params = getTickTockParams(second);
    const now = ctx.currentTime;

    // 1. Filtered mechanical escapement impulse burst
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = getTickNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(params.centerFreqHz, now);
    bandpass.Q.setValueAtTime(4.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(params.peakGain, now + 0.0012);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    noiseSource.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. Subtle clock housing resonance transient
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(params.bodyFreqHz, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(
      params.bodyFreqHz * 0.55,
      now + 0.009
    );

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(params.peakGain * 0.55, now + 0.001);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.009);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);

    noiseSource.onended = () => {
      try {
        noiseSource.disconnect();
        bandpass.disconnect();
        noiseGain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    };

    bodyOsc.onended = () => {
      try {
        bodyOsc.disconnect();
        bodyGain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    };

    noiseSource.start(now);
    noiseSource.stop(now + 0.014);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.011);
  } catch {
    // Ignore audio context scheduling errors
  }
}

/**
 * Sustained (~850ms-920ms) start / cooldown-finish tone sequence for Jujitsu combat rounds.
 */
export function getJujitsuStartLongSequence(
  soundId: JujitsuSoundId
): ToneNote[] {
  switch (soundId) {
    case JujitsuSoundId.MatHorn:
      return [
        { freq: 220.0, offsetMs: 0, durationMs: 880, type: 'sawtooth', peakGain: 0.14 },
        { freq: 277.18, offsetMs: 0, durationMs: 880, type: 'sawtooth', peakGain: 0.11 },
      ];

    case JujitsuSoundId.TatamiGong:
      return [
        { freq: 196.0, offsetMs: 0, durationMs: 920, type: 'triangle', peakGain: 0.2 },
        { freq: 392.0, offsetMs: 15, durationMs: 820, type: 'sine', peakGain: 0.14 },
      ];

    case JujitsuSoundId.QuartzBeep:
      return [
        { freq: 2093.0, offsetMs: 0, durationMs: 840, type: 'square', peakGain: 0.12 },
      ];

    case JujitsuSoundId.ArcadeFight:
      return [
        { freq: 523.25, offsetMs: 0, durationMs: 140, type: 'square', peakGain: 0.12 },
        { freq: 659.25, offsetMs: 150, durationMs: 140, type: 'square', peakGain: 0.12 },
        { freq: 1046.5, offsetMs: 300, durationMs: 580, type: 'square', peakGain: 0.14 },
      ];

    case JujitsuSoundId.DojoBell:
    default:
      return [
        { freq: 880.0, offsetMs: 0, durationMs: 900, type: 'triangle', peakGain: 0.18 },
        { freq: 1318.51, offsetMs: 0, durationMs: 760, type: 'sine', peakGain: 0.13 },
      ];
  }
}

/**
 * Double-strike stop tone sequence (two distinct blasts) played when Jujitsu Countdown ends.
 */
export function getJujitsuStopDoubleSequence(
  soundId: JujitsuSoundId
): ToneNote[] {
  const strikeOffsets = [0, 290];
  const notes: ToneNote[] = [];

  for (const offsetMs of strikeOffsets) {
    switch (soundId) {
      case JujitsuSoundId.DojoBell:
        notes.push(
          { freq: 880.0, offsetMs, durationMs: 210, type: 'triangle', peakGain: 0.18 },
          { freq: 1318.51, offsetMs, durationMs: 185, type: 'sine', peakGain: 0.13 }
        );
        break;

      case JujitsuSoundId.TatamiGong:
        notes.push(
          { freq: 196.0, offsetMs, durationMs: 225, type: 'triangle', peakGain: 0.2 },
          { freq: 293.66, offsetMs, durationMs: 195, type: 'sine', peakGain: 0.13 }
        );
        break;

      case JujitsuSoundId.QuartzBeep:
        notes.push({
          freq: 2093.0,
          offsetMs,
          durationMs: 190,
          type: 'square',
          peakGain: 0.13,
        });
        break;

      case JujitsuSoundId.ArcadeFight:
        notes.push(
          { freq: 783.99, offsetMs, durationMs: 95, type: 'square', peakGain: 0.13 },
          { freq: 523.25, offsetMs: offsetMs + 100, durationMs: 115, type: 'square', peakGain: 0.13 }
        );
        break;

      case JujitsuSoundId.MatHorn:
      default:
        notes.push(
          { freq: 220.0, offsetMs, durationMs: 220, type: 'sawtooth', peakGain: 0.14 },
          { freq: 277.18, offsetMs, durationMs: 220, type: 'sawtooth', peakGain: 0.11 }
        );
        break;
    }
  }

  return notes;
}

/**
 * Quick crisp per-second pip (~75ms) for the last 5 seconds of Jujitsu Cooldown.
 */
export function getJujitsuCooldownTickSequence(secondLeft: number): ToneNote[] {
  const clamped = Math.min(5, Math.max(1, Math.floor(secondLeft)));
  const freq = clamped === 1 ? 1174.66 : 987.77;
  return [
    {
      freq,
      offsetMs: 0,
      durationMs: 75,
      type: 'triangle',
      peakGain: 0.14,
    },
  ];
}

export function playJujitsuStartSound(
  enabled: boolean,
  soundId: JujitsuSoundId
): void {
  clearSingleShotAudio();
  if (!enabled) return;
  playSequence(getJujitsuStartLongSequence(soundId));
}

export function playJujitsuStopDoubleSound(
  enabled: boolean,
  soundId: JujitsuSoundId
): void {
  clearSingleShotAudio();
  if (!enabled) return;
  playSequence(getJujitsuStopDoubleSequence(soundId));
}

/**
 * Plays a quick non-destructive pip for Cooldown's last 5 seconds without cancelling
 * any trailing resonance from a preceding round-end cue.
 */
export function playJujitsuCooldownTickSound(
  enabled: boolean,
  secondLeft: number
): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const [pip] = getJujitsuCooldownTickSequence(secondLeft);
  if (!pip) return;

  try {
    const now = ctx.currentTime;
    const durationSec = pip.durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = pip.type ?? 'triangle';
    osc.frequency.setValueAtTime(pip.freq, now);

    const peak = pip.peakGain ?? 0.14;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006);
    gain.gain.setValueAtTime(peak, Math.max(now + 0.01, now + durationSec - 0.015));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  } catch {
    // Ignore audio context scheduling errors
  }
}



