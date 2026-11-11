import {
  AlarmClockConfig,
  ClockMode,
  ClockSettings,
  CountdownTarget,
  FocusConfig,
  IntervalConfig,
  TimeUntilTarget,
  countdownTargetToMs,
  formatAlarmTimeLabel,
  formatTimeUntilLabel,
  padDigits,
  sanitizeAlarmClockConfig,
  sanitizeCountdownTarget,
  sanitizeFocusConfig,
  sanitizeIntervalConfig,
  sanitizeTimeUntilTarget,
} from './time';

export enum PresetCategory {
  Work = 'work',
  Exercise = 'exercise',
  Meditation = 'meditation',
  General = 'general',
}

export type PresetCategoryFilter = 'all' | PresetCategory;

export const PRESET_CATEGORY_OPTIONS: readonly {
  id: PresetCategory;
  label: string;
}[] = [
  { id: PresetCategory.Work, label: 'Work' },
  { id: PresetCategory.Exercise, label: 'Exercise' },
  { id: PresetCategory.Meditation, label: 'Meditation' },
  { id: PresetCategory.General, label: 'General' },
];

export interface SavedTimerPreset {
  id: string;
  name: string;
  category: PresetCategory;
  mode:
    | ClockMode.Countdown
    | ClockMode.TimeUntil
    | ClockMode.Interval
    | ClockMode.FocusSession
    | ClockMode.AlarmClock;
  countdownTarget?: CountdownTarget;
  timeUntilTarget?: TimeUntilTarget;
  intervalConfig?: IntervalConfig;
  focusConfig?: FocusConfig;
  alarmTime?: Pick<AlarmClockConfig, 'hh' | 'mm' | 'ss'>;
}

export const DEFAULT_TIMER_PRESETS: readonly SavedTimerPreset[] = [
  {
    id: 'preset-pomodoro',
    name: 'Pomodoro 25/5',
    category: PresetCategory.Work,
    mode: ClockMode.Interval,
    intervalConfig: {
      work: { hh: 0, mm: 25, ss: 0 },
      rest: { hh: 0, mm: 5, ss: 0 },
      cycles: 4,
    },
  },
  {
    id: 'preset-tabata',
    name: 'Tabata 20/10',
    category: PresetCategory.Exercise,
    mode: ClockMode.Interval,
    intervalConfig: {
      work: { hh: 0, mm: 0, ss: 20 },
      rest: { hh: 0, mm: 0, ss: 10 },
      cycles: 8,
    },
  },
  {
    id: 'preset-5m',
    name: '5 Min Countdown',
    category: PresetCategory.Meditation,
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 5, ss: 0 },
  },
];

export function getPresetCategoryLabel(category: PresetCategory): string {
  return (
    PRESET_CATEGORY_OPTIONS.find((opt) => opt.id === category)?.label ??
    'General'
  );
}

export function sanitizePresetCategory(
  raw: unknown,
  fallback: PresetCategory = PresetCategory.General
): PresetCategory {
  if (
    typeof raw === 'string' &&
    Object.values(PresetCategory).includes(raw as PresetCategory)
  ) {
    return raw as PresetCategory;
  }
  return fallback;
}

function inferLegacyPresetCategory(
  rec: Partial<SavedTimerPreset>
): PresetCategory {
  if (rec.id === 'preset-pomodoro' || rec.mode === ClockMode.FocusSession) {
    return PresetCategory.Work;
  }
  if (rec.id === 'preset-tabata' || rec.mode === ClockMode.Interval) {
    return PresetCategory.Exercise;
  }
  if (rec.id === 'preset-5m') {
    return PresetCategory.Meditation;
  }
  return PresetCategory.General;
}

export interface PresetCategoryGroup {
  category: PresetCategory;
  label: string;
  items: SavedTimerPreset[];
}

export function groupPresetsByCategory(
  presets: readonly SavedTimerPreset[],
  filter: PresetCategoryFilter = 'all'
): PresetCategoryGroup[] {
  const categoriesToInclude =
    filter === 'all'
      ? PRESET_CATEGORY_OPTIONS.map((opt) => opt.id)
      : [filter];

  const groups: PresetCategoryGroup[] = [];
  for (const cat of categoriesToInclude) {
    const items = presets.filter((p) => p.category === cat);
    if (items.length > 0) {
      groups.push({
        category: cat,
        label: getPresetCategoryLabel(cat),
        items,
      });
    }
  }
  return groups;
}

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
  if (preset.mode === ClockMode.TimeUntil && preset.timeUntilTarget) {
    return `Time Until · ${formatTimeUntilLabel(preset.timeUntilTarget)}`;
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
  category?: PresetCategory;
  mode: ClockMode;
  countdownTarget: CountdownTarget;
  timeUntilTarget?: TimeUntilTarget;
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
    params.mode !== ClockMode.TimeUntil &&
    params.mode !== ClockMode.Interval &&
    params.mode !== ClockMode.FocusSession &&
    params.mode !== ClockMode.AlarmClock
  ) {
    return {
      ok: false,
      error:
        'Switch to Countdown, Time Until, Interval, Focus Session, or Alarm Clock mode to save a preset.',
    };
  }

  const presetId =
    params.id ?? `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const safeName = trimmedName.slice(0, 36);
  const resolvedCategory = sanitizePresetCategory(
    params.category,
    inferLegacyPresetCategory({ mode: params.mode as SavedTimerPreset['mode'] })
  );

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
        category: resolvedCategory,
        mode: ClockMode.Countdown,
        countdownTarget: cleanTarget,
      },
    };
  }

  if (params.mode === ClockMode.TimeUntil) {
    const cleanTarget = sanitizeTimeUntilTarget(
      params.timeUntilTarget ?? { hh: 17, mm: 0, ss: 0 }
    );
    return {
      ok: true,
      preset: {
        id: presetId,
        name: safeName,
        category: resolvedCategory,
        mode: ClockMode.TimeUntil,
        timeUntilTarget: cleanTarget,
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
        category: resolvedCategory,
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
        category: resolvedCategory,
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
      category: resolvedCategory,
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

  if (preset.mode === ClockMode.TimeUntil && preset.timeUntilTarget) {
    return targetsEqual(preset.timeUntilTarget, settings.timeUntilTarget);
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

    const category = sanitizePresetCategory(
      rec.category,
      inferLegacyPresetCategory(rec)
    );

    if (rec.mode === ClockMode.Countdown && rec.countdownTarget) {
      const cleanTarget = sanitizeCountdownTarget(rec.countdownTarget);
      if (countdownTargetToMs(cleanTarget) > 0) {
        valid.push({
          id: rec.id,
          name: trimmed.slice(0, 36),
          category,
          mode: ClockMode.Countdown,
          countdownTarget: cleanTarget,
        });
      }
    } else if (rec.mode === ClockMode.TimeUntil && rec.timeUntilTarget) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        category,
        mode: ClockMode.TimeUntil,
        timeUntilTarget: sanitizeTimeUntilTarget(rec.timeUntilTarget),
      });
    } else if (rec.mode === ClockMode.Interval && rec.intervalConfig) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        category,
        mode: ClockMode.Interval,
        intervalConfig: sanitizeIntervalConfig(rec.intervalConfig),
      });
    } else if (rec.mode === ClockMode.FocusSession && rec.focusConfig) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        category,
        mode: ClockMode.FocusSession,
        focusConfig: sanitizeFocusConfig(rec.focusConfig),
      });
    } else if (rec.mode === ClockMode.AlarmClock && rec.alarmTime) {
      const cleanAlarm = sanitizeAlarmClockConfig(rec.alarmTime);
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        category,
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
