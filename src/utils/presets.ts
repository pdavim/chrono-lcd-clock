import {
  AlarmClockConfig,
  ClockMode,
  ClockSettings,
  CountdownTarget,
  FocusConfig,
  IntervalConfig,
  JujitsuConfig,
  JujitsuSoundId,
  TimeUntilTarget,
  countdownTargetToMs,
  formatAlarmTimeLabel,
  formatTimeUntilLabel,
  padDigits,
  sanitizeAlarmClockConfig,
  sanitizeCountdownTarget,
  sanitizeFocusConfig,
  sanitizeIntervalConfig,
  sanitizeJujitsuConfig,
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

export type PresetClockMode =
  | ClockMode.Countdown
  | ClockMode.TimeUntil
  | ClockMode.Interval
  | ClockMode.Jujitsu
  | ClockMode.FocusSession
  | ClockMode.AlarmClock;

export interface PresetModeOption {
  mode: PresetClockMode;
  label: string;
  shortLabel: string;
}

export const PRESET_MODE_OPTIONS: readonly PresetModeOption[] = [
  { mode: ClockMode.Countdown, label: 'Countdown', shortLabel: 'Countdown' },
  { mode: ClockMode.Jujitsu, label: 'Jujitsu', shortLabel: 'Jujitsu' },
  { mode: ClockMode.Interval, label: 'Interval', shortLabel: 'Interval' },
  { mode: ClockMode.FocusSession, label: 'Focus Session', shortLabel: 'Focus' },
  { mode: ClockMode.TimeUntil, label: 'Time Until', shortLabel: 'Time Until' },
  { mode: ClockMode.AlarmClock, label: 'Alarm Clock', shortLabel: 'Alarm' },
];

export interface SavedTimerPreset {
  id: string;
  name: string;
  category: PresetCategory;
  mode: PresetClockMode;
  countdownTarget?: CountdownTarget;
  timeUntilTarget?: TimeUntilTarget;
  intervalConfig?: IntervalConfig;
  jujitsuConfig?: JujitsuConfig;
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
    id: 'preset-jujitsu',
    name: 'Jujitsu 5m/1m (15m)',
    category: PresetCategory.Exercise,
    mode: ClockMode.Jujitsu,
    jujitsuConfig: {
      countdown: { hh: 0, mm: 5, ss: 0 },
      cooldown: { hh: 0, mm: 1, ss: 0 },
      totalDuration: { hh: 0, mm: 15, ss: 0 },
      startSoundId: JujitsuSoundId.DojoBell,
      stopSoundId: JujitsuSoundId.MatHorn,
    },
  },
  {
    id: 'preset-jujitsu-kumite',
    name: 'Kumite 3m/1m (15m)',
    category: PresetCategory.Exercise,
    mode: ClockMode.Jujitsu,
    jujitsuConfig: {
      countdown: { hh: 0, mm: 3, ss: 0 },
      cooldown: { hh: 0, mm: 1, ss: 0 },
      totalDuration: { hh: 0, mm: 15, ss: 0 },
      startSoundId: JujitsuSoundId.TatamiGong,
      stopSoundId: JujitsuSoundId.MatHorn,
    },
  },
  {
    id: 'preset-5m',
    name: '5 Min Countdown',
    category: PresetCategory.Meditation,
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 5, ss: 0 },
  },
  {
    id: 'preset-15m-meditation',
    name: '15 Min Breathwork',
    category: PresetCategory.Meditation,
    mode: ClockMode.Countdown,
    countdownTarget: { hh: 0, mm: 15, ss: 0 },
  },
  {
    id: 'preset-focus-deep',
    name: 'Deep Focus 25/5',
    category: PresetCategory.Work,
    mode: ClockMode.FocusSession,
    focusConfig: {
      work: { hh: 0, mm: 25, ss: 0 },
      breakDuration: { hh: 0, mm: 5, ss: 0 },
      sessions: 4,
    },
  },
  {
    id: 'preset-focus-sprint',
    name: 'Studio Sprint 50/10',
    category: PresetCategory.Work,
    mode: ClockMode.FocusSession,
    focusConfig: {
      work: { hh: 0, mm: 50, ss: 0 },
      breakDuration: { hh: 0, mm: 10, ss: 0 },
      sessions: 2,
    },
  },
  {
    id: 'preset-timeuntil-wrap',
    name: '17:00 Wrap-Up',
    category: PresetCategory.Work,
    mode: ClockMode.TimeUntil,
    timeUntilTarget: { hh: 17, mm: 0, ss: 0 },
  },
  {
    id: 'preset-timeuntil-noon',
    name: '12:00 Midday Sync',
    category: PresetCategory.Work,
    mode: ClockMode.TimeUntil,
    timeUntilTarget: { hh: 12, mm: 0, ss: 0 },
  },
  {
    id: 'preset-alarm-morning',
    name: '07:00 Morning Wake',
    category: PresetCategory.Exercise,
    mode: ClockMode.AlarmClock,
    alarmTime: { hh: 7, mm: 0, ss: 0 },
  },
  {
    id: 'preset-alarm-early',
    name: '06:15 Mat Session',
    category: PresetCategory.Exercise,
    mode: ClockMode.AlarmClock,
    alarmTime: { hh: 6, mm: 15, ss: 0 },
  },
];

export function isPresetClockMode(mode: ClockMode): mode is PresetClockMode {
  return PRESET_MODE_OPTIONS.some((opt) => opt.mode === mode);
}

/**
 * Returns all preset-capable timer modes with the user's currently active mode
 * placed first (index 0). Falls back to Countdown first if active mode does not
 * use saved presets (e.g., Stopwatch or LiveClock).
 */
export function getOrderedPresetModes(
  activeMode: ClockMode
): PresetClockMode[] {
  const baseModes = PRESET_MODE_OPTIONS.map((opt) => opt.mode);
  const prioritized: PresetClockMode = isPresetClockMode(activeMode)
    ? activeMode
    : ClockMode.Countdown;

  return [
    prioritized,
    ...baseModes.filter((candidate) => candidate !== prioritized),
  ];
}

export function getPresetModeOption(mode: PresetClockMode): PresetModeOption {
  return (
    PRESET_MODE_OPTIONS.find((opt) => opt.mode === mode) ??
    PRESET_MODE_OPTIONS[0]
  );
}

export function filterPresetsByMode(
  presets: readonly SavedTimerPreset[],
  mode: PresetClockMode
): SavedTimerPreset[] {
  return presets.filter((preset) => preset.mode === mode);
}

export interface PresetCardDisplay {
  primaryDigits: string;
  secondarySpec: string;
  categoryLabel: string;
}

export function formatPresetCardDisplay(
  preset: SavedTimerPreset
): PresetCardDisplay {
  const categoryLabel = getPresetCategoryLabel(preset.category);

  if (preset.mode === ClockMode.Countdown && preset.countdownTarget) {
    return {
      primaryDigits: formatCompactDuration(preset.countdownTarget),
      secondarySpec: 'Single countdown',
      categoryLabel,
    };
  }
  if (preset.mode === ClockMode.TimeUntil && preset.timeUntilTarget) {
    const clean = sanitizeTimeUntilTarget(preset.timeUntilTarget);
    const primary =
      clean.ss > 0
        ? formatTimeUntilLabel(clean)
        : `${padDigits(clean.hh)}:${padDigits(clean.mm)}`;
    return {
      primaryDigits: primary,
      secondarySpec: 'Target clock',
      categoryLabel,
    };
  }
  if (preset.mode === ClockMode.Interval && preset.intervalConfig) {
    const { work, rest, cycles } = preset.intervalConfig;
    return {
      primaryDigits: formatCompactDuration(work),
      secondarySpec: `Rest ${formatCompactDuration(rest)} · ${cycles}x`,
      categoryLabel,
    };
  }
  if (preset.mode === ClockMode.Jujitsu && preset.jujitsuConfig) {
    const { countdown, cooldown, totalDuration } = preset.jujitsuConfig;
    return {
      primaryDigits: formatCompactDuration(countdown),
      secondarySpec: `Rest ${formatCompactDuration(cooldown)} · ${formatCompactDuration(totalDuration)}`,
      categoryLabel,
    };
  }
  if (preset.mode === ClockMode.FocusSession && preset.focusConfig) {
    const { work, breakDuration, sessions } = preset.focusConfig;
    return {
      primaryDigits: formatCompactDuration(work),
      secondarySpec: `Break ${formatCompactDuration(breakDuration)} · ${sessions}x`,
      categoryLabel,
    };
  }
  if (preset.mode === ClockMode.AlarmClock && preset.alarmTime) {
    return {
      primaryDigits: formatAlarmTimeLabel(preset.alarmTime),
      secondarySpec: 'Daily wake alarm',
      categoryLabel,
    };
  }

  return {
    primaryDigits: '00:00',
    secondarySpec: 'Saved preset',
    categoryLabel,
  };
}

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
  if (
    rec.id === 'preset-tabata' ||
    rec.id === 'preset-jujitsu' ||
    rec.mode === ClockMode.Interval ||
    rec.mode === ClockMode.Jujitsu
  ) {
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
  if (preset.mode === ClockMode.Jujitsu && preset.jujitsuConfig) {
    const { countdown, cooldown, totalDuration } = preset.jujitsuConfig;
    return `Jujitsu · ${formatCompactDuration(countdown)} / ${formatCompactDuration(cooldown)} · ${formatCompactDuration(totalDuration)}`;
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
  jujitsuConfig?: JujitsuConfig;
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
    params.mode !== ClockMode.Jujitsu &&
    params.mode !== ClockMode.FocusSession &&
    params.mode !== ClockMode.AlarmClock
  ) {
    return {
      ok: false,
      error:
        'Switch to Countdown, Time Until, Interval, Jujitsu, Focus Session, or Alarm Clock mode to save a preset.',
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

  if (params.mode === ClockMode.Jujitsu) {
    const cleanJujitsu = sanitizeJujitsuConfig(params.jujitsuConfig);
    return {
      ok: true,
      preset: {
        id: presetId,
        name: safeName,
        category: resolvedCategory,
        mode: ClockMode.Jujitsu,
        jujitsuConfig: cleanJujitsu,
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

  if (preset.mode === ClockMode.Jujitsu && preset.jujitsuConfig) {
    return (
      targetsEqual(
        preset.jujitsuConfig.countdown,
        settings.jujitsuConfig.countdown
      ) &&
      targetsEqual(
        preset.jujitsuConfig.cooldown,
        settings.jujitsuConfig.cooldown
      ) &&
      targetsEqual(
        preset.jujitsuConfig.totalDuration,
        settings.jujitsuConfig.totalDuration
      ) &&
      preset.jujitsuConfig.startSoundId ===
        settings.jujitsuConfig.startSoundId &&
      preset.jujitsuConfig.stopSoundId === settings.jujitsuConfig.stopSoundId
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
    } else if (rec.mode === ClockMode.Jujitsu && rec.jujitsuConfig) {
      valid.push({
        id: rec.id,
        name: trimmed.slice(0, 36),
        category,
        mode: ClockMode.Jujitsu,
        jujitsuConfig: sanitizeJujitsuConfig(rec.jujitsuConfig),
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
