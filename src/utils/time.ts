import { DEFAULT_MEDIA_CONFIG, MediaConfig } from './media';
import { DEFAULT_SOLAR_SCHEDULE, SolarScheduleSettings } from './solar';

export enum ClockMode {
  Stopwatch = 'stopwatch',
  Countdown = 'countdown',
  TimeUntil = 'time-until',
  Interval = 'interval',
  Jujitsu = 'jujitsu',
  FocusSession = 'focus',
  AlarmClock = 'alarm',
  LiveClock = 'clock',
}

export enum LiveClockTimezone {
  Local = 'local',
  UTC = 'utc',
}

export enum AlarmSoundId {
  CasioPiezo = 'casio-piezo',
  ArcadeChiptune = 'arcade-chiptune',
  RetroPager = 'retro-pager',
  SynthPulse = 'synth-pulse',
}

export interface AlarmSoundOption {
  id: AlarmSoundId;
  label: string;
}

export const ALARM_SOUND_OPTIONS: readonly AlarmSoundOption[] = [
  { id: AlarmSoundId.CasioPiezo, label: '80s Quartz Watch' },
  { id: AlarmSoundId.ArcadeChiptune, label: 'Arcade 8-Bit Fanfare' },
  { id: AlarmSoundId.RetroPager, label: 'Retro Pocket Pager' },
  { id: AlarmSoundId.SynthPulse, label: '80s Synth Pulse' },
];

export enum JujitsuSoundId {
  DojoBell = 'dojo-bell',
  MatHorn = 'mat-horn',
  TatamiGong = 'tatami-gong',
  QuartzBeep = 'quartz-beep',
  ArcadeFight = 'arcade-fight',
}

export interface JujitsuSoundOption {
  id: JujitsuSoundId;
  label: string;
}

export const JUJITSU_SOUND_OPTIONS: readonly JujitsuSoundOption[] = [
  { id: JujitsuSoundId.DojoBell, label: 'Dojo Ring Bell' },
  { id: JujitsuSoundId.MatHorn, label: 'Arena Mat Horn' },
  { id: JujitsuSoundId.TatamiGong, label: 'Tatami Deep Gong' },
  { id: JujitsuSoundId.QuartzBeep, label: '80s Quartz Whistle' },
  { id: JujitsuSoundId.ArcadeFight, label: 'Arcade Kumite Cue' },
];

export enum JujitsuPhase {
  Countdown = 'countdown',
  Cooldown = 'cooldown',
  Completed = 'completed',
}

export enum IntervalPhase {
  Work = 'work',
  Rest = 'rest',
  Completed = 'completed',
}

export enum FontOptionId {
  Timex7Seg = 'timex-7seg',
  Timex7SegItalic = 'timex-7seg-italic',
  Timex14Seg = 'timex-14seg',
  RetroPixel = 'retro-pixel',
  DigitalTech = 'digital-tech',
  SciFi = 'sci-fi',
  ModernClean = 'modern-clean',
}

export interface VisibleFields {
  hh: boolean;
  mm: boolean;
  ss: boolean;
  ms: boolean;
}

export type TimeFieldKey = keyof VisibleFields;

export interface CountdownTarget {
  hh: number;
  mm: number;
  ss: number;
}

export interface TimeUntilTarget {
  hh: number;
  mm: number;
  ss: number;
}

export interface IntervalConfig {
  work: CountdownTarget;
  rest: CountdownTarget;
  cycles: number;
}

export interface IntervalState {
  phase: IntervalPhase;
  currentCycle: number;
  totalCycles: number;
  remainingMs: number;
}

export type IntervalTransitionEvent = 'work-started' | 'rest-started' | 'completed';

export interface AlarmClockConfig {
  enabled: boolean;
  hh: number;
  mm: number;
  ss: number;
}

export interface FocusConfig {
  work: CountdownTarget;
  breakDuration: CountdownTarget;
  sessions: number;
}

export enum FocusPhase {
  Focus = 'focus',
  Break = 'break',
  Completed = 'completed',
}

export interface FocusState {
  phase: FocusPhase;
  currentSession: number;
  totalSessions: number;
  completedSessions: number;
  remainingMs: number;
}

export type FocusTransitionEvent =
  | 'focus-started'
  | 'break-started'
  | 'completed';

export interface JujitsuConfig {
  countdown: CountdownTarget;
  cooldown: CountdownTarget;
  totalDuration: CountdownTarget;
  startSoundId: JujitsuSoundId;
  stopSoundId: JujitsuSoundId;
}

export interface JujitsuState {
  phase: JujitsuPhase;
  round: number;
  remainingMs: number;
  totalDurationMs: number;
  totalRemainingMs: number;
  lastCooldownCueSecond: number | null;
}

export type JujitsuStepEvent =
  | { type: 'cooldown-warning-second'; second: number }
  | { type: 'countdown-ended' }
  | { type: 'cooldown-ended' }
  | { type: 'countdown-started'; round: number }
  | { type: 'training-completed'; endedFrom: 'countdown' | 'cooldown' };

export interface ClockSettings {
  mode: ClockMode;
  liveClockTimezone: LiveClockTimezone;
  visibleFields: VisibleFields;
  showDate: boolean;
  showSessionElapsed: boolean;
  showRadioControl: boolean;
  showBatteryLevel: boolean;
  autoDimEnabled: boolean;
  countdownTarget: CountdownTarget;
  timeUntilTarget: TimeUntilTarget;
  intervalConfig: IntervalConfig;
  jujitsuConfig: JujitsuConfig;
  focusConfig: FocusConfig;
  alarmClock: AlarmClockConfig;
  alarmSoundEnabled: boolean;
  alarmSoundId: AlarmSoundId;
  gradualAlarmVolume: boolean;
  tickSoundEnabled: boolean;
  visualFlashEnabled: boolean;
  vibrationEnabled: boolean;
  doubleTapResetEnabled: boolean;
  media: MediaConfig;
  fontId: FontOptionId;
  clockSizeVw: number;
  clockColor: string;
  bgColor: string;
  solarSchedule: SolarScheduleSettings;
}

export interface FontDefinition {
  id: FontOptionId;
  label: string;
  family: string;
  italic: boolean;
  charWidthEm: number;
}

export const FONT_OPTIONS: readonly FontDefinition[] = [
  {
    id: FontOptionId.Timex7Seg,
    label: '80s Timex LCD (7-Seg)',
    family: "'DSEG7-Classic', monospace",
    italic: false,
    charWidthEm: 0.78,
  },
  {
    id: FontOptionId.Timex7SegItalic,
    label: '80s Timex Sport Italic',
    family: "'DSEG7-Classic', monospace",
    italic: true,
    charWidthEm: 0.8,
  },
  {
    id: FontOptionId.Timex14Seg,
    label: '80s Chrono Alphanumeric (14-Seg)',
    family: "'DSEG14-Classic', monospace",
    italic: false,
    charWidthEm: 0.78,
  },
  {
    id: FontOptionId.RetroPixel,
    label: '80s Retro Pixel (VT323)',
    family: "'VT323', monospace",
    italic: false,
    charWidthEm: 0.52,
  },
  {
    id: FontOptionId.DigitalTech,
    label: 'Digital Tech Mono',
    family: "'Share Tech Mono', monospace",
    italic: false,
    charWidthEm: 0.62,
  },
  {
    id: FontOptionId.SciFi,
    label: 'Retro Futuristic (Orbitron)',
    family: "'Orbitron', sans-serif",
    italic: false,
    charWidthEm: 0.86,
  },
  {
    id: FontOptionId.ModernClean,
    label: 'Clean Geometric Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    italic: false,
    charWidthEm: 0.68,
  },
];

export interface ColorPreset {
  id: string;
  label: string;
  clockColor: string;
  bgColor: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  {
    id: 'indiglo',
    label: 'Timex Indiglo',
    clockColor: '#38ff9c',
    bgColor: '#0b0f12',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    clockColor: '#ffb400',
    bgColor: '#050a14',
  },
  {
    id: 'classic-lcd',
    label: 'Reflective LCD',
    clockColor: '#1a2118',
    bgColor: '#9dad8b',
  },
  {
    id: 'amber-led',
    label: 'Amber Quartz',
    clockColor: '#ffb020',
    bgColor: '#120e09',
  },
  {
    id: 'crimson-led',
    label: 'Red LED',
    clockColor: '#ff4242',
    bgColor: '#100809',
  },
  {
    id: 'ice-white',
    label: 'Crisp Studio',
    clockColor: '#f8fafc',
    bgColor: '#090b10',
  },
];

export const DEFAULT_SETTINGS: ClockSettings = {
  mode: ClockMode.Stopwatch,
  liveClockTimezone: LiveClockTimezone.Local,
  visibleFields: {
    hh: true,
    mm: true,
    ss: true,
    ms: true,
  },
  showDate: false,
  showSessionElapsed: false,
  showRadioControl: true,
  showBatteryLevel: true,
  autoDimEnabled: false,
  countdownTarget: {
    hh: 0,
    mm: 5,
    ss: 0,
  },
  timeUntilTarget: {
    hh: 17,
    mm: 0,
    ss: 0,
  },
  intervalConfig: {
    work: { hh: 0, mm: 0, ss: 30 },
    rest: { hh: 0, mm: 0, ss: 10 },
    cycles: 4,
  },
  jujitsuConfig: {
    countdown: { hh: 0, mm: 5, ss: 0 },
    cooldown: { hh: 0, mm: 1, ss: 0 },
    totalDuration: { hh: 0, mm: 15, ss: 0 },
    startSoundId: JujitsuSoundId.DojoBell,
    stopSoundId: JujitsuSoundId.MatHorn,
  },
  focusConfig: {
    work: { hh: 0, mm: 25, ss: 0 },
    breakDuration: { hh: 0, mm: 5, ss: 0 },
    sessions: 4,
  },
  alarmClock: {
    enabled: false,
    hh: 7,
    mm: 0,
    ss: 0,
  },
  alarmSoundEnabled: true,
  alarmSoundId: AlarmSoundId.CasioPiezo,
  gradualAlarmVolume: false,
  tickSoundEnabled: false,
  visualFlashEnabled: true,
  vibrationEnabled: true,
  doubleTapResetEnabled: true,
  media: { ...DEFAULT_MEDIA_CONFIG },
  fontId: FontOptionId.Timex7Seg,
  clockSizeVw: 9.5,
  clockColor: '#38ff9c',
  bgColor: '#0b0f12',
  solarSchedule: { ...DEFAULT_SOLAR_SCHEDULE },
};

export function padDigits(value: number, digits = 2): string {
  return String(Math.max(0, Math.floor(value))).padStart(digits, '0');
}

export interface TimeParts {
  hh: number;
  mm: number;
  ss: number;
  ms: number;
}

export function decomposeDurationMs(msTotal: number): TimeParts {
  const clamped = Math.max(0, Math.floor(Number.isFinite(msTotal) ? msTotal : 0));
  const ms = clamped % 1000;
  const totalSeconds = Math.floor(clamped / 1000);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  return { hh, mm, ss, ms };
}

export function buildDisplayString(parts: TimeParts, visible: VisibleFields): string {
  const segments: string[] = [];
  if (visible.hh) segments.push(padDigits(parts.hh, 2));
  if (visible.mm) segments.push(padDigits(parts.mm, 2));
  if (visible.ss) segments.push(padDigits(parts.ss, 2));
  if (visible.ms) segments.push(padDigits(parts.ms, 3));

  if (segments.length === 0) {
    return padDigits(parts.ss, 2);
  }
  return segments.join(':');
}

export function formatDurationMs(msTotal: number, visible: VisibleFields): string {
  return buildDisplayString(decomposeDurationMs(msTotal), visible);
}

export function formatSessionElapsedHhMmSs(msTotal: number): string {
  return buildDisplayString(decomposeDurationMs(msTotal), {
    hh: true,
    mm: true,
    ss: true,
    ms: false,
  });
}

export function formatLiveClockDate(
  date: Date,
  visible: VisibleFields,
  timezone: LiveClockTimezone = LiveClockTimezone.Local
): string {
  const isUtc = timezone === LiveClockTimezone.UTC;
  return buildDisplayString(
    {
      hh: isUtc ? date.getUTCHours() : date.getHours(),
      mm: isUtc ? date.getUTCMinutes() : date.getMinutes(),
      ss: isUtc ? date.getUTCSeconds() : date.getSeconds(),
      ms: isUtc ? date.getUTCMilliseconds() : date.getMilliseconds(),
    },
    visible
  );
}

export function formatCalendarDateDdMmYyyy(
  date: Date,
  timezone: LiveClockTimezone = LiveClockTimezone.Local
): string {
  const isUtc = timezone === LiveClockTimezone.UTC;
  const day = isUtc ? date.getUTCDate() : date.getDate();
  const month = (isUtc ? date.getUTCMonth() : date.getMonth()) + 1;
  const year = isUtc ? date.getUTCFullYear() : date.getFullYear();
  return `${padDigits(day, 2)}/${padDigits(month, 2)}/${padDigits(year, 4)}`;
}

export function countActiveFields(visible: VisibleFields): number {
  return (
    (visible.hh ? 1 : 0) +
    (visible.mm ? 1 : 0) +
    (visible.ss ? 1 : 0) +
    (visible.ms ? 1 : 0)
  );
}

export function toggleVisibleField(
  current: VisibleFields,
  field: TimeFieldKey
): VisibleFields {
  if (current[field] && countActiveFields(current) <= 1) {
    return current;
  }
  return {
    ...current,
    [field]: !current[field],
  };
}

export function sanitizeCountdownTarget(
  raw: Partial<CountdownTarget>
): CountdownTarget {
  const clampInt = (val: number | undefined, min: number, max: number): number => {
    if (val === undefined || !Number.isFinite(val)) return min;
    return Math.min(max, Math.max(min, Math.floor(val)));
  };

  return {
    hh: clampInt(raw.hh, 0, 99),
    mm: clampInt(raw.mm, 0, 59),
    ss: clampInt(raw.ss, 0, 59),
  };
}

export function countdownTargetToMs(target: CountdownTarget): number {
  const clean = sanitizeCountdownTarget(target);
  return (clean.hh * 3600 + clean.mm * 60 + clean.ss) * 1000;
}

export function sanitizeTimeUntilTarget(
  raw: Partial<TimeUntilTarget>
): TimeUntilTarget {
  const clampInt = (val: number | undefined, min: number, max: number): number => {
    if (val === undefined || !Number.isFinite(val)) return min;
    return Math.min(max, Math.max(min, Math.floor(val)));
  };

  return {
    hh: clampInt(raw.hh, 0, 23),
    mm: clampInt(raw.mm, 0, 59),
    ss: clampInt(raw.ss, 0, 59),
  };
}

export function formatTimeUntilLabel(target: TimeUntilTarget): string {
  const clean = sanitizeTimeUntilTarget(target);
  return `${padDigits(clean.hh)}:${padDigits(clean.mm)}:${padDigits(clean.ss)}`;
}

export function resolveNextTargetTimestampMs(
  now: Date,
  target: TimeUntilTarget
): { targetTimestampMs: number; isTomorrow: boolean } {
  const clean = sanitizeTimeUntilTarget(target);
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    clean.hh,
    clean.mm,
    clean.ss,
    0
  );
  let isTomorrow = false;
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
    isTomorrow = true;
  }
  return {
    targetTimestampMs: candidate.getTime(),
    isTomorrow,
  };
}

export function computeMsUntilTargetTime(
  now: Date,
  target: TimeUntilTarget
): number {
  const { targetTimestampMs } = resolveNextTargetTimestampMs(now, target);
  return Math.max(0, targetTimestampMs - now.getTime());
}

export function sanitizeIntervalConfig(raw: Partial<IntervalConfig>): IntervalConfig {
  const workClean = sanitizeCountdownTarget(raw.work ?? DEFAULT_SETTINGS.intervalConfig.work);
  const restClean = sanitizeCountdownTarget(raw.rest ?? DEFAULT_SETTINGS.intervalConfig.rest);

  // Guarantee work duration is at least 1 second so interval cycles progress cleanly
  const workFinal =
    countdownTargetToMs(workClean) <= 0 ? { hh: 0, mm: 0, ss: 1 } : workClean;

  const rawCycles = raw.cycles;
  const cycles =
    rawCycles !== undefined && Number.isFinite(rawCycles)
      ? Math.min(99, Math.max(1, Math.floor(rawCycles)))
      : DEFAULT_SETTINGS.intervalConfig.cycles;

  return {
    work: workFinal,
    rest: restClean,
    cycles,
  };
}

export function createInitialIntervalState(config: IntervalConfig): IntervalState {
  const clean = sanitizeIntervalConfig(config);
  return {
    phase: IntervalPhase.Work,
    currentCycle: 1,
    totalCycles: clean.cycles,
    remainingMs: countdownTargetToMs(clean.work),
  };
}

export function advanceIntervalPhase(
  state: IntervalState,
  config: IntervalConfig
): { nextState: IntervalState; event: IntervalTransitionEvent } {
  const clean = sanitizeIntervalConfig(config);
  const workMs = countdownTargetToMs(clean.work);
  const restMs = countdownTargetToMs(clean.rest);

  if (state.phase === IntervalPhase.Work) {
    if (restMs > 0) {
      return {
        nextState: {
          phase: IntervalPhase.Rest,
          currentCycle: state.currentCycle,
          totalCycles: clean.cycles,
          remainingMs: restMs,
        },
        event: 'rest-started',
      };
    }

    if (state.currentCycle < clean.cycles) {
      return {
        nextState: {
          phase: IntervalPhase.Work,
          currentCycle: state.currentCycle + 1,
          totalCycles: clean.cycles,
          remainingMs: workMs,
        },
        event: 'work-started',
      };
    }

    return {
      nextState: {
        phase: IntervalPhase.Completed,
        currentCycle: clean.cycles,
        totalCycles: clean.cycles,
        remainingMs: 0,
      },
      event: 'completed',
    };
  }

  if (state.phase === IntervalPhase.Rest) {
    if (state.currentCycle < clean.cycles) {
      return {
        nextState: {
          phase: IntervalPhase.Work,
          currentCycle: state.currentCycle + 1,
          totalCycles: clean.cycles,
          remainingMs: workMs,
        },
        event: 'work-started',
      };
    }

    return {
      nextState: {
        phase: IntervalPhase.Completed,
        currentCycle: clean.cycles,
        totalCycles: clean.cycles,
        remainingMs: 0,
      },
      event: 'completed',
    };
  }

  return {
    nextState: {
      phase: IntervalPhase.Completed,
      currentCycle: clean.cycles,
      totalCycles: clean.cycles,
      remainingMs: 0,
    },
    event: 'completed',
  };
}

export function stepIntervalState(
  state: IntervalState,
  config: IntervalConfig,
  deltaMs: number
): { nextState: IntervalState; events: IntervalTransitionEvent[] } {
  if (state.phase === IntervalPhase.Completed || deltaMs <= 0) {
    return { nextState: state, events: [] };
  }

  let current = { ...state };
  let remainingDelta = deltaMs;
  const events: IntervalTransitionEvent[] = [];

  // Guard max iterations so corrupted input never loops infinitely
  let safety = 0;
  while (remainingDelta > 0 && current.phase !== IntervalPhase.Completed && safety < 250) {
    safety += 1;
    if (remainingDelta < current.remainingMs) {
      current = {
        ...current,
        remainingMs: current.remainingMs - remainingDelta,
      };
      remainingDelta = 0;
    } else {
      remainingDelta -= current.remainingMs;
      const transition = advanceIntervalPhase(current, config);
      current = transition.nextState;
      events.push(transition.event);
    }
  }

  return { nextState: current, events };
}

export function getFontDefinition(fontId: FontOptionId): FontDefinition {
  return FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0];
}

export function estimateDisplayWidthEm(
  visible: VisibleFields,
  fontId: FontOptionId
): number {
  const sample = buildDisplayString({ hh: 88, mm: 88, ss: 88, ms: 888 }, visible);
  const font = getFontDefinition(fontId);
  const colonCount = (sample.match(/:/g) ?? []).length;
  const digitCount = sample.length - colonCount;
  const totalEm =
    digitCount * font.charWidthEm + colonCount * (font.charWidthEm * 0.45);
  return Math.max(2.2, Number((totalEm + 0.45).toFixed(2)));
}

export const DOUBLE_TAP_THRESHOLD_MS = 280;

export type ClockTapAction =
  | 'close-settings'
  | 'immediate-single-tap'
  | 'defer-single-tap'
  | 'double-tap-reset';

export function evaluateClockTap(params: {
  nowMs: number;
  lastTapMs: number | null;
  doubleTapResetEnabled: boolean;
  mode: ClockMode;
  isSettingsOpen: boolean;
  thresholdMs?: number;
}): {
  action: ClockTapAction;
  nextLastTapMs: number | null;
} {
  if (params.isSettingsOpen) {
    return { action: 'close-settings', nextLastTapMs: null };
  }

  if (
    !params.doubleTapResetEnabled ||
    params.mode === ClockMode.LiveClock ||
    params.mode === ClockMode.AlarmClock
  ) {
    return { action: 'immediate-single-tap', nextLastTapMs: null };
  }

  const threshold = params.thresholdMs ?? DOUBLE_TAP_THRESHOLD_MS;
  if (
    params.lastTapMs !== null &&
    params.nowMs - params.lastTapMs >= 0 &&
    params.nowMs - params.lastTapMs <= threshold
  ) {
    return { action: 'double-tap-reset', nextLastTapMs: null };
  }

  return { action: 'defer-single-tap', nextLastTapMs: params.nowMs };
}

export function sanitizeAlarmClockConfig(
  raw: Partial<AlarmClockConfig>
): AlarmClockConfig {
  const clampInt = (val: number | undefined, min: number, max: number): number => {
    if (val === undefined || !Number.isFinite(val)) return min;
    return Math.min(max, Math.max(min, Math.floor(val)));
  };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    hh: clampInt(raw.hh, 0, 23),
    mm: clampInt(raw.mm, 0, 59),
    ss: clampInt(raw.ss, 0, 59),
  };
}

export function formatAlarmTimeLabel(
  config: Pick<AlarmClockConfig, 'hh' | 'mm' | 'ss'>
): string {
  const clean = sanitizeAlarmClockConfig(config);
  if (clean.ss > 0) {
    return `${padDigits(clean.hh)}:${padDigits(clean.mm)}:${padDigits(clean.ss)}`;
  }
  return `${padDigits(clean.hh)}:${padDigits(clean.mm)}`;
}

export function computeMsUntilAlarm(
  now: Date,
  config: Pick<AlarmClockConfig, 'hh' | 'mm' | 'ss'>
): number {
  const clean = sanitizeAlarmClockConfig(config);
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    clean.hh,
    clean.mm,
    clean.ss,
    0
  );
  let diff = candidate.getTime() - now.getTime();
  if (diff <= 0) {
    candidate.setDate(candidate.getDate() + 1);
    diff = candidate.getTime() - now.getTime();
  }
  return Math.max(0, diff);
}

export function formatRemainingTimeBrief(msTotal: number): string {
  const totalSeconds = Math.max(1, Math.ceil(msTotal / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return seconds > 0 && minutes < 10 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

export const ALARM_SNOOZE_DURATION_MS = 5 * 60 * 1000;

export function evaluateAlarmClockTick(params: {
  now: Date;
  config: AlarmClockConfig;
  armedAtMs: number;
  lastFiredScheduleMs: number | null;
  snoozeUntilMs: number | null;
}): {
  shouldTrigger: boolean;
  nextLastFiredScheduleMs: number | null;
  nextSnoozeUntilMs: number | null;
} {
  const nowMs = params.now.getTime();

  if (params.snoozeUntilMs !== null && nowMs >= params.snoozeUntilMs) {
    return {
      shouldTrigger: true,
      nextLastFiredScheduleMs: params.lastFiredScheduleMs,
      nextSnoozeUntilMs: null,
    };
  }

  if (!params.config.enabled) {
    return {
      shouldTrigger: false,
      nextLastFiredScheduleMs: params.lastFiredScheduleMs,
      nextSnoozeUntilMs: params.snoozeUntilMs,
    };
  }

  const clean = sanitizeAlarmClockConfig(params.config);
  const scheduledTodayMs = new Date(
    params.now.getFullYear(),
    params.now.getMonth(),
    params.now.getDate(),
    clean.hh,
    clean.mm,
    clean.ss,
    0
  ).getTime();

  if (
    nowMs >= scheduledTodayMs &&
    nowMs - scheduledTodayMs < 5000 &&
    params.armedAtMs <= scheduledTodayMs &&
    params.lastFiredScheduleMs !== scheduledTodayMs
  ) {
    return {
      shouldTrigger: true,
      nextLastFiredScheduleMs: scheduledTodayMs,
      nextSnoozeUntilMs: null,
    };
  }

  return {
    shouldTrigger: false,
    nextLastFiredScheduleMs: params.lastFiredScheduleMs,
    nextSnoozeUntilMs: params.snoozeUntilMs,
  };
}

export function sanitizeFocusConfig(raw: Partial<FocusConfig>): FocusConfig {
  const workClean = sanitizeCountdownTarget(
    raw.work ?? DEFAULT_SETTINGS.focusConfig.work
  );
  const breakClean = sanitizeCountdownTarget(
    raw.breakDuration ?? DEFAULT_SETTINGS.focusConfig.breakDuration
  );

  const workFinal =
    countdownTargetToMs(workClean) <= 0 ? { hh: 0, mm: 0, ss: 1 } : workClean;

  const rawSessions = raw.sessions;
  const sessions =
    rawSessions !== undefined && Number.isFinite(rawSessions)
      ? Math.min(24, Math.max(1, Math.floor(rawSessions)))
      : DEFAULT_SETTINGS.focusConfig.sessions;

  return {
    work: workFinal,
    breakDuration: breakClean,
    sessions,
  };
}

export function createInitialFocusState(config: FocusConfig): FocusState {
  const clean = sanitizeFocusConfig(config);
  return {
    phase: FocusPhase.Focus,
    currentSession: 1,
    totalSessions: clean.sessions,
    completedSessions: 0,
    remainingMs: countdownTargetToMs(clean.work),
  };
}

export function advanceFocusPhase(
  state: FocusState,
  config: FocusConfig
): { nextState: FocusState; event: FocusTransitionEvent } {
  const clean = sanitizeFocusConfig(config);
  const workMs = countdownTargetToMs(clean.work);
  const breakMs = countdownTargetToMs(clean.breakDuration);

  if (state.phase === FocusPhase.Focus) {
    const nextCompleted = Math.min(
      clean.sessions,
      state.completedSessions + 1
    );

    if (breakMs > 0) {
      return {
        nextState: {
          phase: FocusPhase.Break,
          currentSession: state.currentSession,
          totalSessions: clean.sessions,
          completedSessions: nextCompleted,
          remainingMs: breakMs,
        },
        event: 'break-started',
      };
    }

    if (state.currentSession < clean.sessions) {
      return {
        nextState: {
          phase: FocusPhase.Focus,
          currentSession: state.currentSession + 1,
          totalSessions: clean.sessions,
          completedSessions: nextCompleted,
          remainingMs: workMs,
        },
        event: 'focus-started',
      };
    }

    return {
      nextState: {
        phase: FocusPhase.Completed,
        currentSession: clean.sessions,
        totalSessions: clean.sessions,
        completedSessions: clean.sessions,
        remainingMs: 0,
      },
      event: 'completed',
    };
  }

  if (state.phase === FocusPhase.Break) {
    if (state.currentSession < clean.sessions) {
      return {
        nextState: {
          phase: FocusPhase.Focus,
          currentSession: state.currentSession + 1,
          totalSessions: clean.sessions,
          completedSessions: state.completedSessions,
          remainingMs: workMs,
        },
        event: 'focus-started',
      };
    }

    return {
      nextState: {
        phase: FocusPhase.Completed,
        currentSession: clean.sessions,
        totalSessions: clean.sessions,
        completedSessions: clean.sessions,
        remainingMs: 0,
      },
      event: 'completed',
    };
  }

  return {
    nextState: {
      phase: FocusPhase.Completed,
      currentSession: clean.sessions,
      totalSessions: clean.sessions,
      completedSessions: clean.sessions,
      remainingMs: 0,
    },
    event: 'completed',
  };
}

export function stepFocusState(
  state: FocusState,
  config: FocusConfig,
  deltaMs: number
): { nextState: FocusState; events: FocusTransitionEvent[] } {
  if (state.phase === FocusPhase.Completed || deltaMs <= 0) {
    return { nextState: state, events: [] };
  }

  let current = { ...state };
  let remainingDelta = deltaMs;
  const events: FocusTransitionEvent[] = [];

  let safety = 0;
  while (
    remainingDelta > 0 &&
    current.phase !== FocusPhase.Completed &&
    safety < 250
  ) {
    safety += 1;
    if (remainingDelta < current.remainingMs) {
      current = {
        ...current,
        remainingMs: current.remainingMs - remainingDelta,
      };
      remainingDelta = 0;
    } else {
      remainingDelta -= current.remainingMs;
      const transition = advanceFocusPhase(current, config);
      current = transition.nextState;
      events.push(transition.event);
    }
  }

  return { nextState: current, events };
}

export const AUTO_DIM_INACTIVITY_MS = 30_000;

export function shouldAutoDimDisplay(params: {
  autoDimEnabled: boolean;
  nowMs: number;
  lastActivityMs: number;
  isSettingsOpen: boolean;
  isAlarmActive: boolean;
  thresholdMs?: number;
}): boolean {
  if (!params.autoDimEnabled) return false;
  if (params.isSettingsOpen) return false;
  if (params.isAlarmActive) return false;

  const threshold = params.thresholdMs ?? AUTO_DIM_INACTIVITY_MS;
  return params.nowMs - params.lastActivityMs >= threshold;
}

export function shouldShowRadioControlBar(params: {
  showRadioControl: boolean;
  isUiHidden: boolean;
  isSettingsOpen: boolean;
}): boolean {
  return (
    params.showRadioControl && !params.isUiHidden && !params.isSettingsOpen
  );
}

export function shouldShowJujitsuQuickStart(params: {
  mode: ClockMode;
  isRunning: boolean;
  isUiHidden: boolean;
  isSettingsOpen: boolean;
  isAlarmRinging: boolean;
}): boolean {
  if (params.isUiHidden || params.isSettingsOpen || params.isAlarmRinging) {
    return false;
  }
  if (params.mode === ClockMode.Jujitsu && params.isRunning) {
    return false;
  }
  return true;
}

export function sanitizeJujitsuSoundId(
  raw: unknown,
  fallback: JujitsuSoundId
): JujitsuSoundId {
  if (
    typeof raw === 'string' &&
    Object.values(JujitsuSoundId).includes(raw as JujitsuSoundId)
  ) {
    return raw as JujitsuSoundId;
  }
  return fallback;
}

export function sanitizeJujitsuConfig(
  raw?: Partial<JujitsuConfig> | null
): JujitsuConfig {
  const defaults = DEFAULT_SETTINGS.jujitsuConfig;
  const countdownClean = sanitizeCountdownTarget(
    raw?.countdown ?? defaults.countdown
  );
  const cooldownClean = sanitizeCountdownTarget(
    raw?.cooldown ?? defaults.cooldown
  );
  const totalClean = sanitizeCountdownTarget(
    raw?.totalDuration ?? defaults.totalDuration
  );

  const countdownFinal =
    countdownTargetToMs(countdownClean) <= 0
      ? { hh: 0, mm: 0, ss: 1 }
      : countdownClean;

  const totalFinal =
    countdownTargetToMs(totalClean) <= 0 ? { hh: 0, mm: 0, ss: 1 } : totalClean;

  return {
    countdown: countdownFinal,
    cooldown: cooldownClean,
    totalDuration: totalFinal,
    startSoundId: sanitizeJujitsuSoundId(
      raw?.startSoundId,
      defaults.startSoundId
    ),
    stopSoundId: sanitizeJujitsuSoundId(raw?.stopSoundId, defaults.stopSoundId),
  };
}

export function createInitialJujitsuState(config: JujitsuConfig): JujitsuState {
  const clean = sanitizeJujitsuConfig(config);
  const countdownMs = countdownTargetToMs(clean.countdown);
  const totalDurationMs = countdownTargetToMs(clean.totalDuration);
  return {
    phase: JujitsuPhase.Countdown,
    round: 1,
    remainingMs: Math.min(countdownMs, totalDurationMs),
    totalDurationMs,
    totalRemainingMs: totalDurationMs,
    lastCooldownCueSecond: null,
  };
}

function collectCooldownWarningSeconds(
  prevRemainingMs: number,
  nextRemainingMs: number,
  lastCueSecond: number | null
): { triggeredSeconds: number[]; nextLastCueSecond: number | null } {
  const triggeredSeconds: number[] = [];
  let updatedLastCue = lastCueSecond;

  for (const sec of [5, 4, 3, 2, 1]) {
    const thresholdMs = sec * 1000;
    const alreadyCued = updatedLastCue !== null && sec >= updatedLastCue;
    if (
      !alreadyCued &&
      prevRemainingMs >= thresholdMs &&
      nextRemainingMs < thresholdMs
    ) {
      triggeredSeconds.push(sec);
      updatedLastCue = sec;
    }
  }

  return { triggeredSeconds, nextLastCueSecond: updatedLastCue };
}

export function stepJujitsuState(
  state: JujitsuState,
  config: JujitsuConfig,
  deltaMs: number
): { nextState: JujitsuState; events: JujitsuStepEvent[] } {
  if (state.phase === JujitsuPhase.Completed || deltaMs <= 0) {
    return { nextState: state, events: [] };
  }

  const clean = sanitizeJujitsuConfig(config);
  const countdownMs = countdownTargetToMs(clean.countdown);
  const cooldownMs = countdownTargetToMs(clean.cooldown);
  const totalDurationMs = countdownTargetToMs(clean.totalDuration);

  let current: JujitsuState = {
    ...state,
    totalDurationMs,
  };
  let remainingDelta = deltaMs;
  const events: JujitsuStepEvent[] = [];

  let safety = 0;
  while (
    remainingDelta > 0 &&
    current.phase !== JujitsuPhase.Completed &&
    safety < 500
  ) {
    safety += 1;
    const phaseBudgetMs = Math.min(current.remainingMs, current.totalRemainingMs);

    if (remainingDelta < phaseBudgetMs) {
      const prevPhaseRem = current.remainingMs;
      const nextPhaseRem = current.remainingMs - remainingDelta;
      const nextTotalRem = Math.max(0, current.totalRemainingMs - remainingDelta);
      let nextLastCue = current.lastCooldownCueSecond;

      if (current.phase === JujitsuPhase.Cooldown) {
        const warning = collectCooldownWarningSeconds(
          prevPhaseRem,
          nextPhaseRem,
          nextLastCue
        );
        for (const sec of warning.triggeredSeconds) {
          events.push({ type: 'cooldown-warning-second', second: sec });
        }
        nextLastCue = warning.nextLastCueSecond;
      }

      current = {
        ...current,
        remainingMs: nextPhaseRem,
        totalRemainingMs: nextTotalRem,
        lastCooldownCueSecond: nextLastCue,
      };
      remainingDelta = 0;
    } else {
      remainingDelta -= phaseBudgetMs;
      const nextTotalRem = Math.max(0, current.totalRemainingMs - phaseBudgetMs);

      if (current.phase === JujitsuPhase.Cooldown) {
        const warning = collectCooldownWarningSeconds(
          current.remainingMs,
          0,
          current.lastCooldownCueSecond
        );
        for (const sec of warning.triggeredSeconds) {
          events.push({ type: 'cooldown-warning-second', second: sec });
        }
        events.push({ type: 'cooldown-ended' });

        if (nextTotalRem <= 0) {
          current = {
            phase: JujitsuPhase.Completed,
            round: current.round,
            remainingMs: 0,
            totalDurationMs,
            totalRemainingMs: 0,
            lastCooldownCueSecond: null,
          };
          events.push({ type: 'training-completed', endedFrom: 'cooldown' });
        } else {
          const nextRound = current.round + 1;
          current = {
            phase: JujitsuPhase.Countdown,
            round: nextRound,
            remainingMs: Math.min(countdownMs, nextTotalRem),
            totalDurationMs,
            totalRemainingMs: nextTotalRem,
            lastCooldownCueSecond: null,
          };
          events.push({ type: 'countdown-started', round: nextRound });
        }
      } else {
        // Countdown phase finished
        events.push({ type: 'countdown-ended' });

        if (nextTotalRem <= 0) {
          current = {
            phase: JujitsuPhase.Completed,
            round: current.round,
            remainingMs: 0,
            totalDurationMs,
            totalRemainingMs: 0,
            lastCooldownCueSecond: null,
          };
          events.push({ type: 'training-completed', endedFrom: 'countdown' });
        } else if (cooldownMs > 0) {
          current = {
            phase: JujitsuPhase.Cooldown,
            round: current.round,
            remainingMs: Math.min(cooldownMs, nextTotalRem),
            totalDurationMs,
            totalRemainingMs: nextTotalRem,
            lastCooldownCueSecond: null,
          };
        } else {
          const nextRound = current.round + 1;
          current = {
            phase: JujitsuPhase.Countdown,
            round: nextRound,
            remainingMs: Math.min(countdownMs, nextTotalRem),
            totalDurationMs,
            totalRemainingMs: nextTotalRem,
            lastCooldownCueSecond: null,
          };
          events.push({ type: 'countdown-started', round: nextRound });
        }
      }
    }
  }

  return { nextState: current, events };
}

