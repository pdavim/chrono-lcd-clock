import test from 'node:test';
import assert from 'node:assert/strict';
import { AlarmSoundId, DEFAULT_SETTINGS } from './time';
import {
  GRADUAL_ALARM_MIN_SCALE,
  GRADUAL_ALARM_RAMP_MS,
  computeGradualVolumeScale,
  getAlarmToneSequence,
  getTickTockParams,
  getVibrationPattern,
  stopVibration,
  triggerVibration,
} from './sound';

test('getAlarmToneSequence produces 4 distinct retro alarm tone patterns', () => {
  const piezo = getAlarmToneSequence(AlarmSoundId.CasioPiezo);
  const arcade = getAlarmToneSequence(AlarmSoundId.ArcadeChiptune);
  const pager = getAlarmToneSequence(AlarmSoundId.RetroPager);
  const synth = getAlarmToneSequence(AlarmSoundId.SynthPulse);

  for (const seq of [piezo, arcade, pager, synth]) {
    assert.ok(seq.length >= 8);
    for (const note of seq) {
      assert.ok(note.freq > 200);
      assert.ok(note.durationMs > 0);
      assert.ok(note.offsetMs >= 0);
    }
  }

  // Verify each retro sound has a distinct frequency signature
  const signature = (seq: ReturnType<typeof getAlarmToneSequence>) =>
    seq.map((n) => `${n.freq}:${n.type ?? 'square'}`).join('|');

  const uniqueSignatures = new Set([
    signature(piezo),
    signature(arcade),
    signature(pager),
    signature(synth),
  ]);
  assert.equal(uniqueSignatures.size, 4);
});

test('triggerVibration and stopVibration invoke navigator.vibrate safely', () => {
  const calls: Array<number | number[]> = [];
  const mockNavigator = {
    vibrate: (pattern: number | number[]) => {
      calls.push(pattern);
      return true;
    },
  };

  assert.equal(triggerVibration(false, 'complete', mockNavigator), false);
  assert.equal(calls.length, 0);

  assert.equal(triggerVibration(true, 'phase', mockNavigator), true);
  assert.deepEqual(calls[0], getVibrationPattern('phase'));

  assert.equal(triggerVibration(true, 'complete', mockNavigator), true);
  assert.deepEqual(calls[1], getVibrationPattern('complete'));

  stopVibration(mockNavigator);
  assert.equal(calls[2], 0);

  // Gracefully handles environments without navigator.vibrate (e.g. desktop / iOS Safari)
  assert.equal(triggerVibration(true, 'complete', {}), false);
  assert.equal(triggerVibration(true, 'complete', null), false);
  stopVibration(null);
});

test('getTickTockParams alternates low-volume mechanical Tick and Tock every second', () => {
  const tick0 = getTickTockParams(0);
  const tock1 = getTickTockParams(1);
  const tick2 = getTickTockParams(2);

  assert.equal(tick0.isTock, false);
  assert.equal(tock1.isTock, true);
  assert.deepEqual(tick0, tick2);

  // Tick is slightly crisper/higher than Tock, and both remain low-volume (<= 0.05)
  assert.ok(tick0.centerFreqHz > tock1.centerFreqHz);
  assert.ok(tick0.peakGain > 0 && tick0.peakGain <= 0.05);
  assert.ok(tock1.peakGain > 0 && tock1.peakGain <= 0.05);
});

test('computeGradualVolumeScale fades alarm volume smoothly from 5% to 100% over 30 seconds', () => {
  assert.equal(DEFAULT_SETTINGS.gradualAlarmVolume, false);
  assert.equal(GRADUAL_ALARM_RAMP_MS, 30_000);

  assert.equal(computeGradualVolumeScale(-500), GRADUAL_ALARM_MIN_SCALE);
  assert.equal(computeGradualVolumeScale(0), GRADUAL_ALARM_MIN_SCALE);

  const mid = computeGradualVolumeScale(15_000);
  assert.ok(Math.abs(mid - 0.525) < 1e-6);

  const threeQuarters = computeGradualVolumeScale(22_500);
  assert.ok(Math.abs(threeQuarters - 0.7625) < 1e-6);

  assert.equal(computeGradualVolumeScale(30_000), 1);
  assert.equal(computeGradualVolumeScale(45_000), 1);
});

