import test from 'node:test';
import assert from 'node:assert/strict';
import { ClockMode, DEFAULT_SETTINGS } from './time';
import {
  DEFAULT_TIMER_PRESETS,
  PresetCategory,
  createTimerPreset,
  formatPresetSummary,
  groupPresetsByCategory,
  isPresetMatchingSettings,
  sanitizePresetsList,
} from './presets';

test('createTimerPreset validates empty name and non-preset modes', () => {
  const emptyRes = createTimerPreset({
    name: '   ',
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 3, ss: 0 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(emptyRes.ok, false);
  if (!emptyRes.ok) {
    assert.match(emptyRes.error, /preset name/i);
  }

  const stopwatchRes = createTimerPreset({
    name: 'My Stopwatch',
    mode: ClockMode.Stopwatch,
    countdownTarget: { hh: 0, mm: 3, ss: 0 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(stopwatchRes.ok, false);

  const zeroCountdownRes = createTimerPreset({
    name: 'Zero Timer',
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 0, ss: 0 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(zeroCountdownRes.ok, false);
});

test('createTimerPreset saves valid countdown and interval presets with clean summaries', () => {
  const cdRes = createTimerPreset({
    id: 'p1',
    name: ' Tea Steep ',
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 4, ss: 30 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(cdRes.ok, true);
  if (cdRes.ok) {
    assert.equal(cdRes.preset.name, 'Tea Steep');
    assert.equal(formatPresetSummary(cdRes.preset), 'Countdown · 04:30');
  }

  const ivRes = createTimerPreset({
    id: 'p2',
    name: 'EMOM 45/15',
    mode: ClockMode.Interval,
    countdownTarget: DEFAULT_SETTINGS.countdownTarget,
    intervalConfig: {
      work: { hh: 0, mm: 0, ss: 45 },
      rest: { hh: 0, mm: 0, ss: 15 },
      cycles: 10,
    },
  });
  assert.equal(ivRes.ok, true);
  if (ivRes.ok) {
    assert.equal(
      formatPresetSummary(ivRes.preset),
      'Interval · 00:45 / 00:15 · 10x'
    );
    assert.equal(
      isPresetMatchingSettings(ivRes.preset, {
        ...DEFAULT_SETTINGS,
        mode: ClockMode.Interval,
        intervalConfig: {
          work: { hh: 0, mm: 0, ss: 45 },
          rest: { hh: 0, mm: 0, ss: 15 },
          cycles: 10,
        },
      }),
      true
    );
  }
});

test('sanitizePresetsList preserves empty arrays and filters invalid records', () => {
  assert.deepEqual(sanitizePresetsList([]), []);
  assert.equal(sanitizePresetsList(null).length, DEFAULT_TIMER_PRESETS.length);
  const cleaned = sanitizePresetsList([
    { id: 'bad', name: '', mode: 'countdown' },
    {
      id: 'good',
      name: 'Plank',
      mode: 'countdown',
      countdownTarget: { hh: 0, mm: 1, ss: 30 },
    },
    {
      id: 'wake',
      name: 'Morning Wake',
      mode: 'alarm',
      alarmTime: { hh: 6, mm: 45, ss: 0 },
    },
  ]);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].name, 'Plank');
  assert.equal(formatPresetSummary(cleaned[1]), 'Alarm · 06:45');

  const alarmPresetRes = createTimerPreset({
    id: 'a1',
    name: 'Studio Call',
    mode: ClockMode.AlarmClock,
    countdownTarget: DEFAULT_SETTINGS.countdownTarget,
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
    alarmClock: { enabled: true, hh: 8, mm: 15, ss: 0 },
  });
  assert.equal(alarmPresetRes.ok, true);
  if (alarmPresetRes.ok) {
    assert.equal(formatPresetSummary(alarmPresetRes.preset), 'Alarm · 08:15');
    assert.equal(
      isPresetMatchingSettings(alarmPresetRes.preset, {
        ...DEFAULT_SETTINGS,
        mode: ClockMode.AlarmClock,
        alarmClock: { enabled: false, hh: 8, mm: 15, ss: 0 },
      }),
      true
    );
  }

  const focusPresetRes = createTimerPreset({
    id: 'f1',
    name: 'Deep Work Pomodoro',
    mode: ClockMode.FocusSession,
    countdownTarget: DEFAULT_SETTINGS.countdownTarget,
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
    focusConfig: {
      work: { hh: 0, mm: 25, ss: 0 },
      breakDuration: { hh: 0, mm: 5, ss: 0 },
      sessions: 4,
    },
  });
  assert.equal(focusPresetRes.ok, true);
  if (focusPresetRes.ok) {
    assert.equal(
      formatPresetSummary(focusPresetRes.preset),
      'Focus · 25:00 / 05:00 · 4x'
    );
    assert.equal(
      isPresetMatchingSettings(focusPresetRes.preset, {
        ...DEFAULT_SETTINGS,
        mode: ClockMode.FocusSession,
      }),
      true
    );
    const sanitizedFocus = sanitizePresetsList([focusPresetRes.preset]);
    assert.equal(sanitizedFocus.length, 1);
    assert.equal(sanitizedFocus[0].mode, ClockMode.FocusSession);
  }

  const timeUntilPresetRes = createTimerPreset({
    id: 'tu1',
    name: 'End of Workday',
    mode: ClockMode.TimeUntil,
    countdownTarget: DEFAULT_SETTINGS.countdownTarget,
    timeUntilTarget: { hh: 17, mm: 30, ss: 15 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(timeUntilPresetRes.ok, true);
  if (timeUntilPresetRes.ok) {
    assert.equal(
      formatPresetSummary(timeUntilPresetRes.preset),
      'Time Until · 17:30:15'
    );
    assert.equal(
      isPresetMatchingSettings(timeUntilPresetRes.preset, {
        ...DEFAULT_SETTINGS,
        mode: ClockMode.TimeUntil,
        timeUntilTarget: { hh: 17, mm: 30, ss: 15 },
      }),
      true
    );
    const sanitizedTu = sanitizePresetsList([timeUntilPresetRes.preset]);
    assert.equal(sanitizedTu.length, 1);
    assert.equal(sanitizedTu[0].mode, ClockMode.TimeUntil);
  }
});

test('groupPresetsByCategory organizes presets into Work, Exercise, Meditation, and General groups', () => {
  const allGroups = groupPresetsByCategory(DEFAULT_TIMER_PRESETS, 'all');
  assert.deepEqual(
    allGroups.map((g) => g.label),
    ['Work', 'Exercise', 'Meditation']
  );

  const meditationOnly = groupPresetsByCategory(
    DEFAULT_TIMER_PRESETS,
    PresetCategory.Meditation
  );
  assert.equal(meditationOnly.length, 1);
  assert.equal(meditationOnly[0].category, PresetCategory.Meditation);
  assert.equal(meditationOnly[0].items[0].name, '5 Min Countdown');

  const medPreset = createTimerPreset({
    id: 'med-10',
    name: '10m Body Scan',
    category: PresetCategory.Meditation,
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 10, ss: 0 },
    intervalConfig: DEFAULT_SETTINGS.intervalConfig,
  });
  assert.equal(medPreset.ok, true);
  if (medPreset.ok) {
    assert.equal(medPreset.preset.category, PresetCategory.Meditation);
    const updatedGroups = groupPresetsByCategory(
      [...DEFAULT_TIMER_PRESETS, medPreset.preset],
      PresetCategory.Meditation
    );
    assert.equal(updatedGroups[0].items.length, 2);
  }
});




