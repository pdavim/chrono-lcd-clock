import {
  AlarmClockConfig,
  ClockMode,
  ClockSettings,
  CountdownTarget,
  FocusConfig,
  IntervalConfig,
  countdownTargetToMs,
  formatAlarmTimeLabel,
  padDigits,
  sanitizeAlarmClockConfig,
  sanitizeCountdownTarget,
  sanitizeFocusConfig,
  sanitizeIntervalConfig,
} from './time';

export interface SavedTimerPreset {
  id: string;
  name: string;
  mode:
    | ClockMode.Countdown
    | ClockMode.Interval
    | ClockMode.FocusSession
    | ClockMode.AlarmClock;
  countdownTarget?: CountdownTarget;
  intervalConfig?: IntervalConfig;
  focusConfig?: FocusConfig;
  alarmTime?: Pick<AlarmClockConfig, 'hh' | 'mm' | 'ss'>;
}

export const DEFAULT_TIMER_PRESETS: readonly SavedTimerPreset[] = [
  {
    id: 'preset-5m',
    name: '5 Min Countdown',
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 5, ss: 0 },
  },
  {
    id: 'preset-tabata',
    name: 'Tabata 20/10',
    mode: ClockMode.Interval,
    intervalConfig: {
      work: { hh: 0, mm: 0, ss: 20 },
      rest: { hh: 0, mm: 0, ss: 10 },
      cycles: 8,
    },
  },
  {
    id: 'preset-pomodoro',
    name: 'Pomodoro 25/5',
    mode: ClockMode.Interval,
    intervalConfig: {
      work: { hh: 0, mm: 25, ss: 0 },
      rest: { hh: 0, mm: 5, ss: 0 },
      cycles: 4,
    },
  },
];

export function formatCompactDuration(target: CountdownTarget): string {
  const clean = sanitizeCountdownTarget(target);
  if (clean.hh > 0) {
    return `${padDigits(clean.hh)}:${padDigits(clean.mm)}:${padDigits(clean.ss)}`;
  }
  return `${padDigits(clean.mm)}:${padDigits(clean.ss)}`;
}

export function formatPresetSummary(preset: SavedTimerPreset): string {
  if (preset.mode === ClockMode.Countdown && preset.countdownTarget) {
    return `Countdown · ${formatCompactDuration(preset.countdownTarget)}`;
  }
  if (preset.mode === ClockMode.Interval && preset.intervalConfig) {
    const { work, rest, cycles } = preset.intervalConfig;
    return `Interval · ${formatCompactDuration(work)} / ${formatCompactDuration(rest)} · ${cycles}x`;
  }
  if (preset.mode === ClockMode.FocusSession && preset.focusConfig) {
    const { work, breakDuration, sessions } = preset.focusConfig;
    return `Focus · ${formatCompactDuration(work)} / ${formatCompactDuration(breakDuration)} · ${sessions}x`;
  }
  if (preset.mode === ClockMode.AlarmClock && preset.alarmTime) {
    return `Alarm · ${formatAlarmTimeLabel(preset.alarmTime)}`;
  }
  return 'Preset';
}

export type CreatePresetResult =
  | { ok: true; preset: SavedTimerPreset }
  | { ok: false; error: string };

export function createTimerPreset(params: {
  id?: string;
  name: string;
  mode: ClockMode;
  countdownTarget: CountdownTarget;
  intervalConfig: IntervalConfig;
  focusConfig?: FocusConfig;
  alarmClock?: AlarmClockConfig;
}): CreatePresetResult {
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    return { ok: false, error: 'Enter a preset name to save.' };
  }

  if (
    params.mode !== ClockMode.Countdown &&
    params.mode !== ClockMode.Interval &&
    params.mode !== ClockMode.FocusSession &&
    params.mode !== ClockMode.AlarmClock
  ) {
    return {
      ok: false,
      error:
        'Switch to Countdown, Interval, Focus Session, or Alarm Clock mode to save a preset.',
    };
  }

  const presetId =
    params.id ?? `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const safeName = trimmedName.slice(0, 36);

  if (params.mode === ClockMode.Countdown) {
    const cleanTarget = sanitizeCountdownTarget(params.countdownTarget);
    if (countdownTargetToMs(cleanTarget) <= 0) {
      return {
        ok: false,
        error: 'Set a countdown duration greater than 0 seconds.',
      };
    }
    return {
      ok: true,
      preset: {
        id: presetId,
        name: safeName,
        mode: ClockMode.Countdown,
        countdownTarget: cleanTarget,
      },
    };
  }

  if (params.mode === ClockMode.FocusSession) {
    const cleanFocus = sanitizeFocusConfig(
      params.focusConfig ?? {
        work: { hh: 0, mm: 25, ss: 0 },
        breakDuration: { hh: 0, mm: 5, ss: 0 },
        sessions: 4,
      }
    );
    return {
      ok: true,
      preset: {
        id: presetId,
        name: safeName,
        mode: ClockMode.FocusSession,
        focusConfig: cleanFocus,
      },
    };
  }

  if (params.mode === ClockMode.AlarmClock) {
    const cleanAlarm = sanitizeAlarmClockConfig(
      params.alarmClock ?? { enabled: true, hh: 7, mm: 0, ss: 0 }
    );
    return {
      ok: true,
      preset: {
        id: presetId,
        name: safeName,
        mode: ClockMode.AlarmClock,
        alarmTime: {
          hh: cleanAlarm.hh,
          mm: cleanAlarm.mm,
          ss: cleanAlarm.ss,
        },
      },
    };
  }

  const cleanInterval = sanitizeIntervalConfig(params.intervalConfig);
  return {
    ok: true,
    preset: {
      id: presetId,
      name: safeName,
      mode: ClockMode.Interval,
      intervalConfig: cleanInterval,
    },
  };
}

function targetsEqual(a: CountdownTarget, b: CountdownTarget): boolean {
  return a.hh === b.hh && a.mm === b.mm && a.ss === b.ss;
}

export function isPresetMatchingSettings(
  preset: SavedTimerPreset,
  settings: ClockSettings
): boolean {
  if (settings.mode !== preset.mode) return false;

  if (preset.mode === ClockMode.Countdown && preset.countdownTarget) {
    return targetsEqual(preset.countdownTarget, settings.countdownTarget);
  }

  if (preset.mode === ClockMode.Interval && preset.intervalConfig) {
    return (
      targetsEqual(preset.intervalConfig.work, settings.intervalConfig.work) &&
      targetsEqual(preset.intervalConfig.rest, settings.intervalConfig.rest) &&
      preset.intervalConfig.cycles === settings.intervalConfig.cycles
    );
  }

  if (preset.mode === ClockMode.FocusSession && preset.focusConfig) {
    return (
      targetsEqual(preset.focusConfig.work, settings.focusConfig.work) &&
      targetsEqual(
        preset.focusConfig.breakDuration,
        settings.focusConfig.breakDuration
      ) &&
      preset.focusConfig.sessions === settings.focusConfig.sessions
    );
  }

  if (preset.mode === ClockMode.AlarmClock && preset.alarmTime) {
    return (
      preset.alarmTime.hh === settings.alarmClock.hh &&
      preset.alarmTime.mm === settings.alarmClock.mm &&
      preset.alarmTime.ss === settings.alarmClock.ss
    );
  }

  return false;
}

export function sanitizePresetsList(raw: unknown): SavedTimerPreset[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_TIMER_PRESETS];
  }

  const valid: SavedTimerPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<SavedTimerPreset>;
    if (typeof rec.id !== 'string' || typeof rec.name !== 'string') continue;
    const trimmed = rec.name.trim();
    if (!trimmed) continue;

    if (rec.mode === ClockMode.Countdown && rec.countdownTarget) {
      const cleanTarget = sanitizeCountdownTarget(rec.countdownTarget);
      if (countdownTargetToMs(cleanTarget) > 0) {
        valid.push({
          id: rec.id,
          name: trimmed.slice(0, 36),
          mode: ClockMode.Countdown,
          countdownTarget: cleanTarget,
        });
      }
    } else if (rec.mode === ClockMode.Interval && rec.intervalConfig) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        mode: ClockMode.Interval,
        intervalConfig: sanitizeIntervalConfig(rec.intervalConfig),
      });
    } else if (rec.mode === ClockMode.FocusSession && rec.focusConfig) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        mode: ClockMode.FocusSession,
        focusConfig: sanitizeFocusConfig(rec.focusConfig),
      });
    } else if (rec.mode === ClockMode.AlarmClock && rec.alarmTime) {
      const cleanAlarm = sanitizeAlarmClockConfig(rec.alarmTime);
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        mode: ClockMode.AlarmClock,
        alarmTime: {
          hh: cleanAlarm.hh,
          mm: cleanAlarm.mm,
          ss: cleanAlarm.ss,
        },
      });
    }
  }

  return valid;
}
