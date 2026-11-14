import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BgFlashEvent, ClockFace } from './components/ClockFace';
import {
  ClockRadioDeck,
  MediaPlaybackCommand,
} from './components/ClockRadioDeck';
import { CornerControls } from './components/CornerControls';
import { SettingsDrawer, SettingsTabId } from './components/SettingsDrawer';
import {
  FullscreenCapableDocument,
  FullscreenCapableElement,
  canRequestNativeFullscreen,
  exitNativeFullscreen,
  getNativeFullscreenElement,
  isExitFullscreenRightSwipe,
  isStandaloneDisplayMode,
  requestNativeFullscreen,
} from './utils/fullscreen';
import {
  AlarmWakeMode,
  MediaConfig,
  sanitizeMediaConfig,
} from './utils/media';
import {
  DEFAULT_TIMER_PRESETS,
  PresetCategory,
  PresetClockMode,
  SavedTimerPreset,
  createTimerPreset,
  sanitizePresetsList,
} from './utils/presets';
import {
  resolveScheduledThemeColors,
  sanitizeGeoCoordinates,
  sanitizeSolarScheduleSettings,
} from './utils/solar';
import {
  playCompletionAlarm,
  playJujitsuCooldownTickSound,
  playJujitsuStartSound,
  playJujitsuStopDoubleSound,
  playMechanicalTickTock,
  playRestStartCue,
  playWorkStartCue,
  startLoopingAlarm,
  stopAlarmSound,
  stopVibration,
  triggerVibration,
  unlockAudioContext,
} from './utils/sound';
import {
  ALARM_SNOOZE_DURATION_MS,
  AlarmSoundId,
  ClockMode,
  ClockSettings,
  CountdownTarget,
  DEFAULT_SETTINGS,
  DOUBLE_TAP_THRESHOLD_MS,
  FocusPhase,
  FocusState,
  FontOptionId,
  IntervalPhase,
  IntervalState,
  JujitsuPhase,
  JujitsuSoundId,
  JujitsuState,
  LiveClockTimezone,
  TimeFieldKey,
  TimeUntilTarget,
  countdownTargetToMs,
  createInitialFocusState,
  createInitialIntervalState,
  createInitialJujitsuState,
  estimateDisplayWidthEm,
  evaluateAlarmClockTick,
  evaluateClockTap,
  formatCalendarDateDdMmYyyy,
  formatDurationMs,
  formatLiveClockDate,
  formatSessionElapsedHhMmSs,
  getFontDefinition,
  isTimerClockMode,
  resolveNextTargetTimestampMs,
  resolveSettingsThemeVars,
  sanitizeAlarmClockConfig,
  sanitizeCountdownTarget,
  sanitizeFocusConfig,
  sanitizeIntervalConfig,
  sanitizeJujitsuConfig,
  sanitizeTimeUntilTarget,
  shouldAutoDimDisplay,
  stepFocusState,
  stepIntervalState,
  stepJujitsuState,
  toggleVisibleField,
} from './utils/time';

const STORAGE_KEY = 'chrono80_settings_v1';
const PRESETS_STORAGE_KEY = 'chrono80_presets_v1';
const MS_DEFAULT_MIGRATION_KEY = 'chrono80_ms_default_v2';

function loadSavedPresets(): SavedTimerPreset[] {
  if (typeof window === 'undefined') return [...DEFAULT_TIMER_PRESETS];
  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_TIMER_PRESETS];
    return sanitizePresetsList(JSON.parse(raw));
  } catch {
    return [...DEFAULT_TIMER_PRESETS];
  }
}

function loadSavedSettings(): ClockSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const hasMigratedMsDefault =
      window.localStorage.getItem(MS_DEFAULT_MIGRATION_KEY) === '1';
    if (!hasMigratedMsDefault) {
      window.localStorage.setItem(MS_DEFAULT_MIGRATION_KEY, '1');
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ClockSettings>;

    return {
      mode:
        parsed.mode && Object.values(ClockMode).includes(parsed.mode)
          ? parsed.mode
          : DEFAULT_SETTINGS.mode,
      liveClockTimezone:
        parsed.liveClockTimezone &&
        Object.values(LiveClockTimezone).includes(parsed.liveClockTimezone)
          ? parsed.liveClockTimezone
          : DEFAULT_SETTINGS.liveClockTimezone,
      visibleFields: {
        hh: parsed.visibleFields?.hh ?? DEFAULT_SETTINGS.visibleFields.hh,
        mm: parsed.visibleFields?.mm ?? DEFAULT_SETTINGS.visibleFields.mm,
        ss: parsed.visibleFields?.ss ?? DEFAULT_SETTINGS.visibleFields.ss,
        ms: hasMigratedMsDefault
          ? (parsed.visibleFields?.ms ?? DEFAULT_SETTINGS.visibleFields.ms)
          : false,
      },
      showDate:
        typeof parsed.showDate === 'boolean'
          ? parsed.showDate
          : DEFAULT_SETTINGS.showDate,
      showSessionElapsed:
        typeof parsed.showSessionElapsed === 'boolean'
          ? parsed.showSessionElapsed
          : DEFAULT_SETTINGS.showSessionElapsed,
      showRadioControl:
        typeof parsed.showRadioControl === 'boolean'
          ? parsed.showRadioControl
          : DEFAULT_SETTINGS.showRadioControl,
      showJujitsuQuickStart:
        typeof parsed.showJujitsuQuickStart === 'boolean'
          ? parsed.showJujitsuQuickStart
          : DEFAULT_SETTINGS.showJujitsuQuickStart,
      showBatteryLevel:
        typeof parsed.showBatteryLevel === 'boolean'
          ? parsed.showBatteryLevel
          : DEFAULT_SETTINGS.showBatteryLevel,
      autoDimEnabled:
        typeof parsed.autoDimEnabled === 'boolean'
          ? parsed.autoDimEnabled
          : DEFAULT_SETTINGS.autoDimEnabled,
      autoFullscreenWebApp:
        typeof parsed.autoFullscreenWebApp === 'boolean'
          ? parsed.autoFullscreenWebApp
          : DEFAULT_SETTINGS.autoFullscreenWebApp,
      countdownTarget: sanitizeCountdownTarget(
        parsed.countdownTarget ?? DEFAULT_SETTINGS.countdownTarget
      ),
      timeUntilTarget: sanitizeTimeUntilTarget(
        parsed.timeUntilTarget ?? DEFAULT_SETTINGS.timeUntilTarget
      ),
      intervalConfig: sanitizeIntervalConfig(
        parsed.intervalConfig ?? DEFAULT_SETTINGS.intervalConfig
      ),
      jujitsuConfig: sanitizeJujitsuConfig(
        parsed.jujitsuConfig ?? DEFAULT_SETTINGS.jujitsuConfig
      ),
      focusConfig: sanitizeFocusConfig(
        parsed.focusConfig ?? DEFAULT_SETTINGS.focusConfig
      ),
      alarmClock: sanitizeAlarmClockConfig(
        parsed.alarmClock ?? DEFAULT_SETTINGS.alarmClock
      ),
      alarmSoundEnabled:
        typeof parsed.alarmSoundEnabled === 'boolean'
          ? parsed.alarmSoundEnabled
          : DEFAULT_SETTINGS.alarmSoundEnabled,
      alarmSoundId:
        parsed.alarmSoundId &&
        Object.values(AlarmSoundId).includes(parsed.alarmSoundId)
          ? parsed.alarmSoundId
          : DEFAULT_SETTINGS.alarmSoundId,
      gradualAlarmVolume:
        typeof parsed.gradualAlarmVolume === 'boolean'
          ? parsed.gradualAlarmVolume
          : DEFAULT_SETTINGS.gradualAlarmVolume,
      tickSoundEnabled:
        typeof parsed.tickSoundEnabled === 'boolean'
          ? parsed.tickSoundEnabled
          : DEFAULT_SETTINGS.tickSoundEnabled,
      media: sanitizeMediaConfig(parsed.media ?? DEFAULT_SETTINGS.media),
      visualFlashEnabled:
        typeof parsed.visualFlashEnabled === 'boolean'
          ? parsed.visualFlashEnabled
          : DEFAULT_SETTINGS.visualFlashEnabled,
      vibrationEnabled:
        typeof parsed.vibrationEnabled === 'boolean'
          ? parsed.vibrationEnabled
          : DEFAULT_SETTINGS.vibrationEnabled,
      doubleTapResetEnabled:
        typeof parsed.doubleTapResetEnabled === 'boolean'
          ? parsed.doubleTapResetEnabled
          : DEFAULT_SETTINGS.doubleTapResetEnabled,
      fontId:
        parsed.fontId && Object.values(FontOptionId).includes(parsed.fontId)
          ? parsed.fontId
          : DEFAULT_SETTINGS.fontId,
      clockSizeVw:
        typeof parsed.clockSizeVw === 'number' &&
        Number.isFinite(parsed.clockSizeVw)
          ? Math.min(24, Math.max(4, parsed.clockSizeVw))
          : DEFAULT_SETTINGS.clockSizeVw,
      clockColor:
        typeof parsed.clockColor === 'string' && parsed.clockColor.startsWith('#')
          ? parsed.clockColor
          : DEFAULT_SETTINGS.clockColor,
      bgColor:
        typeof parsed.bgColor === 'string' && parsed.bgColor.startsWith('#')
          ? parsed.bgColor
          : DEFAULT_SETTINGS.bgColor,
      solarSchedule: sanitizeSolarScheduleSettings(parsed.solarSchedule),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function requestScreenWakeLock(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      await navigator.wakeLock.request('screen');
    }
  } catch {
    // Wake Lock may be disallowed in background tabs or headless frames
  }
}

export default function App() {
  const [settings, setSettings] = useState<ClockSettings>(() => loadSavedSettings());
  const [presets, setPresets] = useState<SavedTimerPreset[]>(() =>
    loadSavedPresets()
  );
  const [isRunning, setIsRunning] = useState<boolean>(
    () => settings.mode === ClockMode.TimeUntil
  );
  const [isTimeUntilTomorrow, setIsTimeUntilTomorrow] = useState<boolean>(
    () =>
      resolveNextTargetTimestampMs(new Date(), settings.timeUntilTarget)
        .isTomorrow
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [requestedSettingsTab, setRequestedSettingsTab] = useState<{
    key: number;
    tab: SettingsTabId;
  } | null>(null);
  const [mediaCommand, setMediaCommand] = useState<MediaPlaybackCommand | null>(
    null
  );
  const [isUiHidden, setIsUiHidden] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAlarmBlinking, setIsAlarmBlinking] = useState<boolean>(false);
  const [isAlarmClockRinging, setIsAlarmClockRinging] = useState<boolean>(false);
  const [snoozeUntilMs, setSnoozeUntilMs] = useState<number | null>(null);
  const [snoozeRemainingMs, setSnoozeRemainingMs] = useState<number | null>(null);
  const [phaseFlashKey, setPhaseFlashKey] = useState<number>(0);
  const [bgFlashEvent, setBgFlashEvent] = useState<BgFlashEvent | null>(null);
  const [solarGeoStatus, setSolarGeoStatus] = useState<
    'idle' | 'locating' | 'ready' | 'error'
  >(() => (settings.solarSchedule.coords ? 'ready' : 'idle'));
  const [solarGeoError, setSolarGeoError] = useState<string | null>(null);
  const [solarEvalTick, setSolarEvalTick] = useState<number>(() => Date.now());

  const sessionStartedAtMsRef = useRef<number>(Date.now());
  const [sessionElapsedText, setSessionElapsedText] = useState<string>('00:00:00');
  const [calendarDateText, setCalendarDateText] = useState<string>(() =>
    formatCalendarDateDdMmYyyy(
      new Date(),
      settings.mode === ClockMode.LiveClock
        ? settings.liveClockTimezone
        : LiveClockTimezone.Local
    )
  );

  const [intervalState, setIntervalState] = useState<IntervalState>(() =>
    createInitialIntervalState(settings.intervalConfig)
  );
  const [jujitsuState, setJujitsuState] = useState<JujitsuState>(() =>
    createInitialJujitsuState(settings.jujitsuConfig)
  );
  const [focusState, setFocusState] = useState<FocusState>(() =>
    createInitialFocusState(settings.focusConfig)
  );
  const [isAutoDimmed, setIsAutoDimmed] = useState<boolean>(false);
  const lastActivityMsRef = useRef<number>(Date.now());

  // Refs for high-precision 60fps animation without React state thrashing
  const displayRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<ClockSettings>(settings);
  settingsRef.current = settings;

  const isRunningRef = useRef<boolean>(isRunning);
  isRunningRef.current = isRunning;

  const isSettingsOpenRef = useRef<boolean>(isSettingsOpen);
  isSettingsOpenRef.current = isSettingsOpen;
  const isFullscreenRef = useRef<boolean>(isFullscreen);
  isFullscreenRef.current = isFullscreen;
  const nativeFullscreenActiveRef = useRef<boolean>(false);
  const rightSwipeStartRef = useRef<{
    x: number;
    y: number;
    startedAtMs: number;
  } | null>(null);
  const suppressNextClockClickRef = useRef<boolean>(false);
  const lastModalPaintMsRef = useRef<number>(0);

  const isAlarmClockRingingRef = useRef<boolean>(isAlarmClockRinging);
  isAlarmClockRingingRef.current = isAlarmClockRinging;

  const alarmArmedAtMsRef = useRef<number>(Date.now());
  const lastFiredAlarmScheduleMsRef = useRef<number | null>(null);

  const stopwatchElapsedRef = useRef<number>(0);
  const stopwatchStartOriginRef = useRef<number>(0);

  const countdownRemainingRef = useRef<number>(
    countdownTargetToMs(settings.countdownTarget)
  );
  const countdownEndTimestampRef = useRef<number>(0);

  const initialTimeUntil = resolveNextTargetTimestampMs(
    new Date(),
    settings.timeUntilTarget
  );
  const timeUntilEpochMsRef = useRef<number>(
    initialTimeUntil.targetTimestampMs
  );
  const timeUntilRemainingRef = useRef<number>(
    Math.max(0, initialTimeUntil.targetTimestampMs - Date.now())
  );

  const intervalStateRef = useRef<IntervalState>(intervalState);
  intervalStateRef.current = intervalState;
  const jujitsuStateRef = useRef<JujitsuState>(jujitsuState);
  jujitsuStateRef.current = jujitsuState;
  const jujitsuLastTotalSecondRef = useRef<number>(-1);
  const focusStateRef = useRef<FocusState>(focusState);
  focusStateRef.current = focusState;
  const lastFrameTimeRef = useRef<number>(0);

  const lastTapTimeRef = useRef<number | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);
  const lastDoubleResetMsRef = useRef<number>(0);
  const lastTickedSecondRef = useRef<number | null>(null);
  const tickTestTimerRef = useRef<number | null>(null);

  const issueMediaCommand = useCallback(
    (action: MediaPlaybackCommand['action']) => {
      setMediaCommand((prev) => ({
        key: (prev?.key ?? 0) + 1,
        action,
      }));
    },
    []
  );

  const handleWakeStreamFallback = useCallback(() => {
    if (
      isAlarmClockRingingRef.current &&
      settingsRef.current.media.alarmBackupTone &&
      settingsRef.current.alarmSoundEnabled
    ) {
      startLoopingAlarm({
        soundEnabled: true,
        soundId: settingsRef.current.alarmSoundId,
        vibrationEnabled: settingsRef.current.vibrationEnabled,
        gradualVolume: settingsRef.current.gradualAlarmVolume,
        onAutoStop: () => {
          isAlarmClockRingingRef.current = false;
          setIsAlarmClockRinging(false);
        },
      });
    }
  }, []);

  const clearPendingSingleTap = useCallback(() => {
    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    lastTapTimeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
      if (tickTestTimerRef.current !== null) {
        window.clearTimeout(tickTestTimerRef.current);
      }
      stopAlarmSound();
    };
  }, []);

  // Persist settings and presets to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota issues
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // Ignore storage quota issues
    }
  }, [presets]);

  const requestBrowserGeolocation = useCallback((forceFresh = false) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setSolarGeoStatus('error');
      setSolarGeoError(
        'Browser Geolocation API is not supported on this device.'
      );
      return;
    }

    setSolarGeoStatus('locating');
    setSolarGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = sanitizeGeoCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        if (!coords) {
          setSolarGeoStatus('error');
          setSolarGeoError('Received invalid coordinates from browser.');
          return;
        }
        setSolarGeoStatus('ready');
        setSolarGeoError(null);
        setSolarEvalTick(Date.now());
        setSettings((prev) => ({
          ...prev,
          solarSchedule: {
            ...prev.solarSchedule,
            enabled: true,
            coords,
          },
        }));
      },
      (err) => {
        setSolarGeoStatus('error');
        const message =
          err.code === 1
            ? 'Location permission denied. Allow location access and retry.'
            : 'Unable to determine current location. Check location services and retry.';
        setSolarGeoError(message);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: forceFresh ? 0 : 60_000,
      }
    );
  }, []);

  const handleToggleSolarSchedule = useCallback(() => {
    if (settingsRef.current.solarSchedule.enabled) {
      setSolarGeoError(null);
      setSettings((prev) => ({
        ...prev,
        solarSchedule: {
          ...prev.solarSchedule,
          enabled: false,
        },
      }));
      return;
    }

    setSolarEvalTick(Date.now());
    setSettings((prev) => ({
      ...prev,
      solarSchedule: {
        ...prev.solarSchedule,
        enabled: true,
      },
    }));

    if (!settingsRef.current.solarSchedule.coords) {
      requestBrowserGeolocation();
    } else {
      setSolarGeoStatus('ready');
      setSolarGeoError(null);
    }
  }, [requestBrowserGeolocation]);

  useEffect(() => {
    if (!settings.solarSchedule.enabled) {
      return undefined;
    }
    if (!settings.solarSchedule.coords) {
      requestBrowserGeolocation();
      return undefined;
    }
    setSolarEvalTick(Date.now());
    const id = window.setInterval(() => {
      setSolarEvalTick(Date.now());
    }, 15_000);
    return () => window.clearInterval(id);
  }, [
    settings.solarSchedule.enabled,
    settings.solarSchedule.coords,
    requestBrowserGeolocation,
  ]);

  const scheduledTheme = resolveScheduledThemeColors({
    now: new Date(solarEvalTick),
    preferredClockColor: settings.clockColor,
    preferredBgColor: settings.bgColor,
    solarSchedule: settings.solarSchedule,
  });

  // Sync dynamic CSS variables to :root (zero inline style={{}} needed)
  useEffect(() => {
    const root = document.documentElement;
    const fontDef = getFontDefinition(settings.fontId);
    const widthEm = estimateDisplayWidthEm(
      settings.visibleFields,
      settings.fontId
    );
    const settingsTheme = resolveSettingsThemeVars(
      scheduledTheme.activeClockColor,
      scheduledTheme.activeBgColor
    );

    root.style.setProperty('--clock-color', scheduledTheme.activeClockColor);
    root.style.setProperty('--clock-bg', scheduledTheme.activeBgColor);
    root.style.setProperty('--clock-font', fontDef.family);
    root.style.setProperty(
      '--clock-font-style',
      fontDef.italic ? 'italic' : 'normal'
    );
    root.style.setProperty('--clock-size-vw', String(settings.clockSizeVw));
    root.style.setProperty('--clock-width-em', String(widthEm));
    root.style.setProperty('--settings-accent', settingsTheme.accentColor);
    root.style.setProperty('--settings-accent-fg', settingsTheme.accentFg);
    root.style.setProperty('--settings-surface', settingsTheme.surfaceBg);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', scheduledTheme.activeBgColor);
    }
  }, [
    scheduledTheme.activeClockColor,
    scheduledTheme.activeBgColor,
    settings.fontId,
    settings.clockSizeVw,
    settings.visibleFields,
  ]);

  // Compute current display text for static refreshes & initial render
  const getStaticDisplayText = useCallback(
    (
      currentSettings: ClockSettings,
      currentInterval: IntervalState,
      currentFocus: FocusState,
      currentJujitsu: JujitsuState = jujitsuStateRef.current
    ): string => {
      if (currentSettings.mode === ClockMode.LiveClock) {
        return formatLiveClockDate(
          new Date(),
          currentSettings.visibleFields,
          currentSettings.liveClockTimezone
        );
      }
      if (currentSettings.mode === ClockMode.AlarmClock) {
        return formatLiveClockDate(
          new Date(),
          currentSettings.visibleFields,
          LiveClockTimezone.Local
        );
      }
      if (currentSettings.mode === ClockMode.Countdown) {
        return formatDurationMs(
          countdownRemainingRef.current,
          currentSettings.visibleFields
        );
      }
      if (currentSettings.mode === ClockMode.TimeUntil) {
        return formatDurationMs(
          timeUntilRemainingRef.current,
          currentSettings.visibleFields
        );
      }
      if (currentSettings.mode === ClockMode.Interval) {
        return formatDurationMs(
          currentInterval.remainingMs,
          currentSettings.visibleFields
        );
      }
      if (currentSettings.mode === ClockMode.Jujitsu) {
        return formatDurationMs(
          currentJujitsu.remainingMs,
          currentSettings.visibleFields
        );
      }
      if (currentSettings.mode === ClockMode.FocusSession) {
        return formatDurationMs(
          currentFocus.remainingMs,
          currentSettings.visibleFields
        );
      }
      return formatDurationMs(
        stopwatchElapsedRef.current,
        currentSettings.visibleFields
      );
    },
    []
  );

  const syncDomDisplay = useCallback(
    (
      nextSettings = settingsRef.current,
      nextInterval = intervalStateRef.current,
      nextFocus = focusStateRef.current,
      nextJujitsu = jujitsuStateRef.current
    ) => {
      if (displayRef.current) {
        displayRef.current.textContent = getStaticDisplayText(
          nextSettings,
          nextInterval,
          nextFocus,
          nextJujitsu
        );
      }
    },
    [getStaticDisplayText]
  );

  // Refresh static text immediately whenever fields or mode/targets update while paused
  useEffect(() => {
    if (
      !isRunning &&
      settings.mode !== ClockMode.LiveClock &&
      settings.mode !== ClockMode.AlarmClock
    ) {
      syncDomDisplay(settings, intervalState, focusState, jujitsuState);
    }
  }, [
    settings,
    intervalState,
    focusState,
    jujitsuState,
    isRunning,
    syncDomDisplay,
  ]);

  // Update DD/MM/YYYY Calendar Date cleanly when enabled (including midnight rollover & UTC Live Clock)
  useEffect(() => {
    if (!settings.showDate) {
      return undefined;
    }

    const activeTimezone =
      settings.mode === ClockMode.LiveClock
        ? settings.liveClockTimezone
        : LiveClockTimezone.Local;

    const updateCalendarDate = () => {
      const formatted = formatCalendarDateDdMmYyyy(new Date(), activeTimezone);
      setCalendarDateText((prev) => (prev === formatted ? prev : formatted));
    };

    updateCalendarDate();
    const timerId = window.setInterval(updateCalendarDate, 1000);
    return () => window.clearInterval(timerId);
  }, [settings.showDate, settings.mode, settings.liveClockTimezone]);

  // Update HH:MM:SS Session Elapsed sub-counter cleanly when enabled
  useEffect(() => {
    if (!settings.showSessionElapsed) {
      return undefined;
    }

    const updateSessionCounter = () => {
      const elapsedMs = Math.max(0, Date.now() - sessionStartedAtMsRef.current);
      const formatted = formatSessionElapsedHhMmSs(elapsedMs);
      setSessionElapsedText((prev) => (prev === formatted ? prev : formatted));
    };

    updateSessionCounter();
    const timerId = window.setInterval(updateSessionCounter, 250);
    return () => window.clearInterval(timerId);
  }, [settings.showSessionElapsed]);

  // Track user pointer/keyboard/touch activity to immediately restore brightness when Auto-Dim is active
  useEffect(() => {
    const markActivity = () => {
      lastActivityMsRef.current = Date.now();
      setIsAutoDimmed((prev) => (prev ? false : prev));
    };

    const events: readonly (keyof WindowEventMap)[] = [
      'pointerdown',
      'pointermove',
      'mousemove',
      'keydown',
      'touchstart',
      'wheel',
    ];

    events.forEach((evt) =>
      window.addEventListener(evt, markActivity, { passive: true })
    );

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, markActivity));
    };
  }, []);

  // Auto-Dim burn-in protection after 30 seconds of inactivity
  useEffect(() => {
    const isAlarmActive = isAlarmBlinking || isAlarmClockRinging;
    if (!settings.autoDimEnabled || isSettingsOpen || isAlarmActive) {
      lastActivityMsRef.current = Date.now();
      setIsAutoDimmed(false);
      return undefined;
    }

    const evaluateDim = () => {
      const nextDimmed = shouldAutoDimDisplay({
        autoDimEnabled: settingsRef.current.autoDimEnabled,
        nowMs: Date.now(),
        lastActivityMs: lastActivityMsRef.current,
        isSettingsOpen,
        isAlarmActive,
      });
      setIsAutoDimmed((prev) => (prev === nextDimmed ? prev : nextDimmed));
    };

    evaluateDim();
    const timerId = window.setInterval(evaluateDim, 500);
    return () => window.clearInterval(timerId);
  }, [
    settings.autoDimEnabled,
    isSettingsOpen,
    isAlarmBlinking,
    isAlarmClockRinging,
  ]);

  // Background wall-clock watcher for Daily Alarm Clock & Snooze
  useEffect(() => {
    if (!settings.alarmClock.enabled && snoozeUntilMs === null) {
      setSnoozeRemainingMs(null);
      return undefined;
    }

    const checkAlarm = () => {
      const now = new Date();

      if (snoozeUntilMs !== null) {
        const rem = Math.max(0, snoozeUntilMs - now.getTime());
        setSnoozeRemainingMs(rem);
      } else {
        setSnoozeRemainingMs(null);
      }

      if (isAlarmClockRingingRef.current) return;

      const tickResult = evaluateAlarmClockTick({
        now,
        config: settingsRef.current.alarmClock,
        armedAtMs: alarmArmedAtMsRef.current,
        lastFiredScheduleMs: lastFiredAlarmScheduleMsRef.current,
        snoozeUntilMs,
      });

      if (tickResult.shouldTrigger) {
        lastFiredAlarmScheduleMsRef.current = tickResult.nextLastFiredScheduleMs;
        setSnoozeUntilMs(tickResult.nextSnoozeUntilMs);
        setSnoozeRemainingMs(null);
        isAlarmClockRingingRef.current = true;
        setIsAlarmClockRinging(true);
        setIsUiHidden(false);
        setPhaseFlashKey((k) => k + 1);

        if (settingsRef.current.visualFlashEnabled) {
          setBgFlashEvent((prev) => ({
            key: (prev?.key ?? 0) + 1,
            kind: 'complete',
          }));
        }

        const useMediaWake =
          settingsRef.current.media.alarmWakeMode === AlarmWakeMode.Media;

        if (useMediaWake) {
          issueMediaCommand('wake-alarm');
          startLoopingAlarm({
            soundEnabled: false,
            soundId: settingsRef.current.alarmSoundId,
            vibrationEnabled: settingsRef.current.vibrationEnabled,
            onAutoStop: () => {
              isAlarmClockRingingRef.current = false;
              setIsAlarmClockRinging(false);
            },
          });
        } else {
          startLoopingAlarm({
            soundEnabled: settingsRef.current.alarmSoundEnabled,
            soundId: settingsRef.current.alarmSoundId,
            vibrationEnabled: settingsRef.current.vibrationEnabled,
            gradualVolume: settingsRef.current.gradualAlarmVolume,
            onAutoStop: () => {
              isAlarmClockRingingRef.current = false;
              setIsAlarmClockRinging(false);
            },
          });
        }
      }
    };

    checkAlarm();
    const intervalId = window.setInterval(checkAlarm, 200);
    return () => window.clearInterval(intervalId);
  }, [
    settings.alarmClock.enabled,
    settings.alarmClock.hh,
    settings.alarmClock.mm,
    settings.alarmClock.ss,
    snoozeUntilMs,
    issueMediaCommand,
  ]);

  // High-precision requestAnimationFrame loop
  useEffect(() => {
    let frameId = 0;

    if (
      settings.mode === ClockMode.LiveClock ||
      settings.mode === ClockMode.AlarmClock
    ) {
      lastTickedSecondRef.current = null;
      const tickLiveClock = () => {
        const now = new Date();
        const activeTz =
          settingsRef.current.mode === ClockMode.LiveClock
            ? settingsRef.current.liveClockTimezone
            : LiveClockTimezone.Local;

        if (displayRef.current) {
          displayRef.current.textContent = formatLiveClockDate(
            now,
            settingsRef.current.visibleFields,
            activeTz
          );
        }

        if (settingsRef.current.mode === ClockMode.LiveClock) {
          const sec =
            activeTz === LiveClockTimezone.UTC
              ? now.getUTCSeconds()
              : now.getSeconds();
          if (lastTickedSecondRef.current === null) {
            lastTickedSecondRef.current = sec;
          } else if (lastTickedSecondRef.current !== sec) {
            lastTickedSecondRef.current = sec;
            if (
              settingsRef.current.tickSoundEnabled &&
              !isAlarmClockRingingRef.current
            ) {
              playMechanicalTickTock(true, sec);
            }
          }
        }

        frameId = window.requestAnimationFrame(tickLiveClock);
      };
      frameId = window.requestAnimationFrame(tickLiveClock);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (!isRunning) {
      return undefined;
    }

    if (settings.mode === ClockMode.Stopwatch) {
      const tickStopwatch = () => {
        if (!isRunningRef.current) return;
        const now = performance.now();
        stopwatchElapsedRef.current = now - stopwatchStartOriginRef.current;
        if (displayRef.current) {
          displayRef.current.textContent = formatDurationMs(
            stopwatchElapsedRef.current,
            settingsRef.current.visibleFields
          );
        }
        frameId = window.requestAnimationFrame(tickStopwatch);
      };
      frameId = window.requestAnimationFrame(tickStopwatch);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (settings.mode === ClockMode.Countdown) {
      const tickCountdown = () => {
        if (!isRunningRef.current) return;
        const now = performance.now();
        const remaining = countdownEndTimestampRef.current - now;

        if (remaining <= 0) {
          countdownRemainingRef.current = 0;
          isRunningRef.current = false;
          setIsRunning(false);
          setIsAlarmBlinking(true);
          setPhaseFlashKey((k) => k + 1);
          if (settingsRef.current.visualFlashEnabled) {
            setBgFlashEvent((prev) => ({
              key: (prev?.key ?? 0) + 1,
              kind: 'complete',
            }));
          }
          if (displayRef.current) {
            displayRef.current.textContent = formatDurationMs(
              0,
              settingsRef.current.visibleFields
            );
          }
          playCompletionAlarm(
            settingsRef.current.alarmSoundEnabled,
            settingsRef.current.alarmSoundId,
            settingsRef.current.gradualAlarmVolume
          );
          triggerVibration(settingsRef.current.vibrationEnabled, 'complete');
          return;
        }

        countdownRemainingRef.current = remaining;
        if (displayRef.current) {
          displayRef.current.textContent = formatDurationMs(
            remaining,
            settingsRef.current.visibleFields
          );
        }
        frameId = window.requestAnimationFrame(tickCountdown);
      };
      frameId = window.requestAnimationFrame(tickCountdown);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (settings.mode === ClockMode.TimeUntil) {
      const tickTimeUntil = () => {
        if (!isRunningRef.current) return;
        const remaining = timeUntilEpochMsRef.current - Date.now();

        if (remaining <= 0) {
          timeUntilRemainingRef.current = 0;
          isRunningRef.current = false;
          setIsRunning(false);
          setIsAlarmBlinking(true);
          setIsAutoDimmed(false);
          setPhaseFlashKey((k) => k + 1);
          if (settingsRef.current.visualFlashEnabled) {
            setBgFlashEvent((prev) => ({
              key: (prev?.key ?? 0) + 1,
              kind: 'complete',
            }));
          }
          if (displayRef.current) {
            displayRef.current.textContent = formatDurationMs(
              0,
              settingsRef.current.visibleFields
            );
          }
          playCompletionAlarm(
            settingsRef.current.alarmSoundEnabled,
            settingsRef.current.alarmSoundId,
            settingsRef.current.gradualAlarmVolume
          );
          triggerVibration(settingsRef.current.vibrationEnabled, 'complete');
          return;
        }

        timeUntilRemainingRef.current = remaining;
        const nowPerf = performance.now();
        if (
          displayRef.current &&
          (!isSettingsOpenRef.current ||
            nowPerf - lastModalPaintMsRef.current >= 250)
        ) {
          lastModalPaintMsRef.current = nowPerf;
          displayRef.current.textContent = formatDurationMs(
            remaining,
            settingsRef.current.visibleFields
          );
        }
        frameId = window.requestAnimationFrame(tickTimeUntil);
      };
      frameId = window.requestAnimationFrame(tickTimeUntil);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (settings.mode === ClockMode.Interval) {
      lastFrameTimeRef.current = performance.now();

      const tickInterval = () => {
        if (!isRunningRef.current) return;
        const now = performance.now();
        const deltaMs = Math.max(0, now - lastFrameTimeRef.current);
        lastFrameTimeRef.current = now;

        const { nextState, events } = stepIntervalState(
          intervalStateRef.current,
          settingsRef.current.intervalConfig,
          deltaMs
        );

        intervalStateRef.current = nextState;

        if (displayRef.current) {
          displayRef.current.textContent = formatDurationMs(
            nextState.remainingMs,
            settingsRef.current.visibleFields
          );
        }

        if (events.length > 0) {
          setIntervalState(nextState);
          setPhaseFlashKey((k) => k + 1);

          const latestEvent = events[events.length - 1];
          if (settingsRef.current.visualFlashEnabled) {
            setBgFlashEvent((prev) => ({
              key: (prev?.key ?? 0) + 1,
              kind: latestEvent === 'completed' ? 'complete' : 'phase',
            }));
          }

          if (latestEvent === 'completed') {
            isRunningRef.current = false;
            setIsRunning(false);
            setIsAlarmBlinking(true);
            playCompletionAlarm(
              settingsRef.current.alarmSoundEnabled,
              settingsRef.current.alarmSoundId,
              settingsRef.current.gradualAlarmVolume
            );
            triggerVibration(settingsRef.current.vibrationEnabled, 'complete');
            return;
          } else if (latestEvent === 'rest-started') {
            playRestStartCue(settingsRef.current.alarmSoundEnabled);
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          } else if (latestEvent === 'work-started') {
            playWorkStartCue(settingsRef.current.alarmSoundEnabled);
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          }
        }

        frameId = window.requestAnimationFrame(tickInterval);
      };

      frameId = window.requestAnimationFrame(tickInterval);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (settings.mode === ClockMode.Jujitsu) {
      lastFrameTimeRef.current = performance.now();
      jujitsuLastTotalSecondRef.current = Math.ceil(
        jujitsuStateRef.current.totalRemainingMs / 1000
      );

      const tickJujitsu = () => {
        if (!isRunningRef.current) return;
        const now = performance.now();
        const deltaMs = Math.max(0, now - lastFrameTimeRef.current);
        lastFrameTimeRef.current = now;

        const { nextState, events } = stepJujitsuState(
          jujitsuStateRef.current,
          settingsRef.current.jujitsuConfig,
          deltaMs
        );

        jujitsuStateRef.current = nextState;

        if (displayRef.current) {
          displayRef.current.textContent = formatDurationMs(
            nextState.remainingMs,
            settingsRef.current.visibleFields
          );
        }

        const totalSecCeil = Math.ceil(nextState.totalRemainingMs / 1000);
        if (
          events.length > 0 ||
          totalSecCeil !== jujitsuLastTotalSecondRef.current
        ) {
          jujitsuLastTotalSecondRef.current = totalSecCeil;
          setJujitsuState(nextState);
        }

        if (events.length > 0) {
          const completedEvt = events.find(
            (evt): evt is Extract<typeof evt, { type: 'training-completed' }> =>
              evt.type === 'training-completed'
          );
          const hasCooldownEnded = events.some(
            (evt) => evt.type === 'cooldown-ended'
          );
          const hasCountdownEnded = events.some(
            (evt) => evt.type === 'countdown-ended'
          );
          const warningEvents = events.filter(
            (
              evt
            ): evt is Extract<
              typeof evt,
              { type: 'cooldown-warning-second' }
            > => evt.type === 'cooldown-warning-second'
          );

          if (completedEvt) {
            isRunningRef.current = false;
            setIsRunning(false);
            setIsAlarmBlinking(true);
            setIsAutoDimmed(false);
            setPhaseFlashKey((k) => k + 1);
            if (settingsRef.current.visualFlashEnabled) {
              setBgFlashEvent((prev) => ({
                key: (prev?.key ?? 0) + 1,
                kind: 'complete',
              }));
            }
            if (completedEvt.endedFrom === 'countdown') {
              playJujitsuStopDoubleSound(
                settingsRef.current.alarmSoundEnabled,
                settingsRef.current.jujitsuConfig.stopSoundId
              );
            } else {
              playJujitsuStartSound(
                settingsRef.current.alarmSoundEnabled,
                settingsRef.current.jujitsuConfig.startSoundId
              );
            }
            triggerVibration(settingsRef.current.vibrationEnabled, 'complete');
            return;
          }

          if (hasCooldownEnded) {
            setPhaseFlashKey((k) => k + 1);
            if (settingsRef.current.visualFlashEnabled) {
              setBgFlashEvent((prev) => ({
                key: (prev?.key ?? 0) + 1,
                kind: 'phase',
              }));
            }
            playJujitsuStartSound(
              settingsRef.current.alarmSoundEnabled,
              settingsRef.current.jujitsuConfig.startSoundId
            );
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          } else if (hasCountdownEnded) {
            setPhaseFlashKey((k) => k + 1);
            if (settingsRef.current.visualFlashEnabled) {
              setBgFlashEvent((prev) => ({
                key: (prev?.key ?? 0) + 1,
                kind: 'phase',
              }));
            }
            playJujitsuStopDoubleSound(
              settingsRef.current.alarmSoundEnabled,
              settingsRef.current.jujitsuConfig.stopSoundId
            );
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          } else if (warningEvents.length > 0) {
            const latestWarning = warningEvents[warningEvents.length - 1];
            setPhaseFlashKey((k) => k + 1);
            if (settingsRef.current.visualFlashEnabled) {
              setBgFlashEvent((prev) => ({
                key: (prev?.key ?? 0) + 1,
                kind: 'tick',
              }));
            }
            playJujitsuCooldownTickSound(
              settingsRef.current.alarmSoundEnabled,
              latestWarning.second
            );
          }
        }

        frameId = window.requestAnimationFrame(tickJujitsu);
      };

      frameId = window.requestAnimationFrame(tickJujitsu);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (settings.mode === ClockMode.FocusSession) {
      lastFrameTimeRef.current = performance.now();

      const tickFocus = () => {
        if (!isRunningRef.current) return;
        const now = performance.now();
        const deltaMs = Math.max(0, now - lastFrameTimeRef.current);
        lastFrameTimeRef.current = now;

        const { nextState, events } = stepFocusState(
          focusStateRef.current,
          settingsRef.current.focusConfig,
          deltaMs
        );

        focusStateRef.current = nextState;

        if (displayRef.current) {
          displayRef.current.textContent = formatDurationMs(
            nextState.remainingMs,
            settingsRef.current.visibleFields
          );
        }

        if (events.length > 0) {
          setFocusState(nextState);
          setPhaseFlashKey((k) => k + 1);

          const latestEvent = events[events.length - 1];
          if (settingsRef.current.visualFlashEnabled) {
            setBgFlashEvent((prev) => ({
              key: (prev?.key ?? 0) + 1,
              kind: latestEvent === 'completed' ? 'complete' : 'phase',
            }));
          }

          if (latestEvent === 'completed') {
            isRunningRef.current = false;
            setIsRunning(false);
            setIsAlarmBlinking(true);
            setIsAutoDimmed(false);
            playCompletionAlarm(
              settingsRef.current.alarmSoundEnabled,
              settingsRef.current.alarmSoundId,
              settingsRef.current.gradualAlarmVolume
            );
            triggerVibration(settingsRef.current.vibrationEnabled, 'complete');
            return;
          } else if (latestEvent === 'break-started') {
            playRestStartCue(settingsRef.current.alarmSoundEnabled);
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          } else if (latestEvent === 'focus-started') {
            playWorkStartCue(settingsRef.current.alarmSoundEnabled);
            triggerVibration(settingsRef.current.vibrationEnabled, 'phase');
          }
        }

        frameId = window.requestAnimationFrame(tickFocus);
      };

      frameId = window.requestAnimationFrame(tickFocus);
      return () => window.cancelAnimationFrame(frameId);
    }

    return undefined;
  }, [isRunning, settings.mode]);

  const maybeEnterStandaloneNativeFullscreen = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !settingsRef.current.autoFullscreenWebApp
    ) {
      return;
    }
    if (!isStandaloneDisplayMode(window, window.navigator)) {
      return;
    }
    const fsDoc = document as FullscreenCapableDocument;
    const fsEl = document.documentElement as FullscreenCapableElement;
    if (getNativeFullscreenElement(fsDoc)) {
      return;
    }
    if (!canRequestNativeFullscreen(fsDoc, fsEl)) {
      return;
    }
    void requestNativeFullscreen(fsEl).then((entered) => {
      if (entered) {
        nativeFullscreenActiveRef.current = true;
        isFullscreenRef.current = true;
        setIsFullscreen(true);
      }
    });
  }, []);

  const handleToggleStartPause = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      maybeEnterStandaloneNativeFullscreen();
      unlockAudioContext();
      stopAlarmSound();
      setIsAlarmBlinking(false);
      setBgFlashEvent(null);

      const currentMode = settingsRef.current.mode;
      if (currentMode === ClockMode.LiveClock) return;

      if (!isRunningRef.current) {
        if (currentMode === ClockMode.Stopwatch) {
          stopwatchStartOriginRef.current =
            performance.now() - stopwatchElapsedRef.current;
          isRunningRef.current = true;
          setIsRunning(true);
        } else if (currentMode === ClockMode.Countdown) {
          if (countdownRemainingRef.current <= 0) {
            countdownRemainingRef.current = countdownTargetToMs(
              settingsRef.current.countdownTarget
            );
          }
          if (countdownRemainingRef.current > 0) {
            countdownEndTimestampRef.current =
              performance.now() + countdownRemainingRef.current;
            isRunningRef.current = true;
            setIsRunning(true);
          }
        } else if (currentMode === ClockMode.TimeUntil) {
          const now = new Date();
          const resolved = resolveNextTargetTimestampMs(
            now,
            settingsRef.current.timeUntilTarget
          );
          timeUntilEpochMsRef.current = resolved.targetTimestampMs;
          timeUntilRemainingRef.current = Math.max(
            0,
            resolved.targetTimestampMs - now.getTime()
          );
          setIsTimeUntilTomorrow(resolved.isTomorrow);
          isRunningRef.current = true;
          setIsRunning(true);
        } else if (currentMode === ClockMode.Interval) {
          let activeInterval = intervalStateRef.current;
          if (
            activeInterval.phase === IntervalPhase.Completed ||
            activeInterval.remainingMs <= 0
          ) {
            activeInterval = createInitialIntervalState(
              settingsRef.current.intervalConfig
            );
            intervalStateRef.current = activeInterval;
            setIntervalState(activeInterval);
          }
          lastFrameTimeRef.current = performance.now();
          isRunningRef.current = true;
          setIsRunning(true);
        } else if (currentMode === ClockMode.Jujitsu) {
          let activeJujitsu = jujitsuStateRef.current;
          if (
            activeJujitsu.phase === JujitsuPhase.Completed ||
            activeJujitsu.totalRemainingMs <= 0 ||
            activeJujitsu.remainingMs <= 0
          ) {
            activeJujitsu = createInitialJujitsuState(
              settingsRef.current.jujitsuConfig
            );
            jujitsuStateRef.current = activeJujitsu;
            setJujitsuState(activeJujitsu);
          }
          const isFreshSessionStart =
            activeJujitsu.round === 1 &&
            activeJujitsu.phase === JujitsuPhase.Countdown &&
            activeJujitsu.totalRemainingMs === activeJujitsu.totalDurationMs;
          lastFrameTimeRef.current = performance.now();
          isRunningRef.current = true;
          setIsRunning(true);
          if (isFreshSessionStart) {
            playJujitsuStartSound(
              settingsRef.current.alarmSoundEnabled,
              settingsRef.current.jujitsuConfig.startSoundId
            );
          }
        } else if (currentMode === ClockMode.FocusSession) {
          let activeFocus = focusStateRef.current;
          if (
            activeFocus.phase === FocusPhase.Completed ||
            activeFocus.remainingMs <= 0
          ) {
            activeFocus = createInitialFocusState(
              settingsRef.current.focusConfig
            );
            focusStateRef.current = activeFocus;
            setFocusState(activeFocus);
          }
          lastFrameTimeRef.current = performance.now();
          isRunningRef.current = true;
          setIsRunning(true);
        }
        requestScreenWakeLock();
      } else {
        isRunningRef.current = false;
        setIsRunning(false);
        if (currentMode === ClockMode.Interval) {
          setIntervalState({ ...intervalStateRef.current });
        } else if (currentMode === ClockMode.Jujitsu) {
          setJujitsuState({ ...jujitsuStateRef.current });
        } else if (currentMode === ClockMode.FocusSession) {
          setFocusState({ ...focusStateRef.current });
        }
      }
    },
    [maybeEnterStandaloneNativeFullscreen]
  );

  const handleReset = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      stopAlarmSound();
      isRunningRef.current = false;
      setIsRunning(false);
      setIsAlarmBlinking(false);
      setBgFlashEvent(null);

      const currentSettings = settingsRef.current;
      if (currentSettings.mode === ClockMode.Countdown) {
        countdownRemainingRef.current = countdownTargetToMs(
          currentSettings.countdownTarget
        );
        syncDomDisplay(
          currentSettings,
          intervalStateRef.current,
          focusStateRef.current
        );
      } else if (currentSettings.mode === ClockMode.TimeUntil) {
        const now = new Date();
        const resolved = resolveNextTargetTimestampMs(
          now,
          currentSettings.timeUntilTarget
        );
        timeUntilEpochMsRef.current = resolved.targetTimestampMs;
        timeUntilRemainingRef.current = Math.max(
          0,
          resolved.targetTimestampMs - now.getTime()
        );
        setIsTimeUntilTomorrow(resolved.isTomorrow);
        syncDomDisplay(
          currentSettings,
          intervalStateRef.current,
          focusStateRef.current
        );
      } else if (currentSettings.mode === ClockMode.Interval) {
        const fresh = createInitialIntervalState(currentSettings.intervalConfig);
        intervalStateRef.current = fresh;
        setIntervalState(fresh);
        syncDomDisplay(
          currentSettings,
          fresh,
          focusStateRef.current,
          jujitsuStateRef.current
        );
      } else if (currentSettings.mode === ClockMode.Jujitsu) {
        const freshJujitsu = createInitialJujitsuState(
          currentSettings.jujitsuConfig
        );
        jujitsuStateRef.current = freshJujitsu;
        setJujitsuState(freshJujitsu);
        syncDomDisplay(
          currentSettings,
          intervalStateRef.current,
          focusStateRef.current,
          freshJujitsu
        );
      } else if (currentSettings.mode === ClockMode.FocusSession) {
        const freshFocus = createInitialFocusState(currentSettings.focusConfig);
        focusStateRef.current = freshFocus;
        setFocusState(freshFocus);
        syncDomDisplay(
          currentSettings,
          intervalStateRef.current,
          freshFocus,
          jujitsuStateRef.current
        );
      } else if (currentSettings.mode === ClockMode.Stopwatch) {
        stopwatchElapsedRef.current = 0;
        syncDomDisplay(
          currentSettings,
          intervalStateRef.current,
          focusStateRef.current
        );
      }
    },
    [syncDomDisplay]
  );

  const handleQuickStartJujitsu = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      maybeEnterStandaloneNativeFullscreen();
      clearPendingSingleTap();
      unlockAudioContext();
      stopAlarmSound();
      if (
        isAlarmClockRingingRef.current &&
        settingsRef.current.media.alarmWakeMode === AlarmWakeMode.Media
      ) {
        issueMediaCommand('pause');
      }
      isAlarmClockRingingRef.current = false;
      setIsAlarmClockRinging(false);
      setIsAlarmBlinking(false);
      setIsAutoDimmed(false);

      const cleanConfig = sanitizeJujitsuConfig(
        settingsRef.current.jujitsuConfig
      );
      const freshJujitsu = createInitialJujitsuState(cleanConfig);
      jujitsuStateRef.current = freshJujitsu;
      jujitsuLastTotalSecondRef.current = Math.ceil(
        freshJujitsu.totalRemainingMs / 1000
      );
      setJujitsuState(freshJujitsu);

      const nextSettings: ClockSettings = {
        ...settingsRef.current,
        mode: ClockMode.Jujitsu,
        jujitsuConfig: cleanConfig,
      };
      settingsRef.current = nextSettings;
      setSettings(nextSettings);

      syncDomDisplay(
        nextSettings,
        intervalStateRef.current,
        focusStateRef.current,
        freshJujitsu
      );

      lastFrameTimeRef.current = performance.now();
      isRunningRef.current = true;
      setIsRunning(true);
      setPhaseFlashKey((k) => k + 1);
      if (nextSettings.visualFlashEnabled) {
        setBgFlashEvent((prev) => ({
          key: (prev?.key ?? 0) + 1,
          kind: 'phase',
        }));
      }
      playJujitsuStartSound(
        nextSettings.alarmSoundEnabled,
        cleanConfig.startSoundId
      );
      requestScreenWakeLock();
    },
    [
      clearPendingSingleTap,
      issueMediaCommand,
      maybeEnterStandaloneNativeFullscreen,
      syncDomDisplay,
    ]
  );

  const handleStopRingingAlarm = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      stopAlarmSound();
      if (settingsRef.current.media.alarmWakeMode === AlarmWakeMode.Media) {
        issueMediaCommand('pause');
      }
      isAlarmClockRingingRef.current = false;
      setIsAlarmClockRinging(false);
      setSnoozeUntilMs(null);
      setSnoozeRemainingMs(null);
      setBgFlashEvent(null);
    },
    [issueMediaCommand]
  );

  const handleSnoozeRingingAlarm = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      stopAlarmSound();
      if (settingsRef.current.media.alarmWakeMode === AlarmWakeMode.Media) {
        issueMediaCommand('pause');
      }
      isAlarmClockRingingRef.current = false;
      setIsAlarmClockRinging(false);
      setBgFlashEvent(null);
      const until = Date.now() + ALARM_SNOOZE_DURATION_MS;
      setSnoozeUntilMs(until);
      setSnoozeRemainingMs(ALARM_SNOOZE_DURATION_MS);
    },
    [issueMediaCommand]
  );

  const handleCancelSnooze = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      setSnoozeUntilMs(null);
      setSnoozeRemainingMs(null);
    },
    []
  );

  const handleToggleAlarmClockArmed = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      unlockAudioContext();

      if (isAlarmClockRingingRef.current) {
        stopAlarmSound();
        if (settingsRef.current.media.alarmWakeMode === AlarmWakeMode.Media) {
          issueMediaCommand('pause');
        }
        isAlarmClockRingingRef.current = false;
        setIsAlarmClockRinging(false);
        setSnoozeUntilMs(null);
        setSnoozeRemainingMs(null);
        setBgFlashEvent(null);
        return;
      }

      setSettings((prev) => {
        const nextEnabled = !prev.alarmClock.enabled;
        if (nextEnabled) {
          alarmArmedAtMsRef.current = Date.now();
          lastFiredAlarmScheduleMsRef.current = null;
          requestScreenWakeLock();
        } else {
          stopAlarmSound();
        }
        return {
          ...prev,
          alarmClock: {
            ...prev.alarmClock,
            enabled: nextEnabled,
          },
        };
      });
      setSnoozeUntilMs(null);
      setSnoozeRemainingMs(null);
    },
    [issueMediaCommand]
  );

  const handleChangeAlarmTime = useCallback((rawTime: CountdownTarget) => {
    unlockAudioContext();
    stopAlarmSound();
    isAlarmClockRingingRef.current = false;
    setIsAlarmClockRinging(false);
    setSnoozeUntilMs(null);
    setSnoozeRemainingMs(null);
    setBgFlashEvent(null);

    const cleanAlarm = sanitizeAlarmClockConfig({
      enabled: true,
      hh: rawTime.hh,
      mm: rawTime.mm,
      ss: rawTime.ss,
    });
    alarmArmedAtMsRef.current = Date.now();
    lastFiredAlarmScheduleMsRef.current = null;
    setSettings((prev) => ({
      ...prev,
      alarmClock: cleanAlarm,
    }));
    requestScreenWakeLock();
  }, []);

  const handleExitFullscreen = useCallback(() => {
    nativeFullscreenActiveRef.current = false;
    isFullscreenRef.current = false;
    setIsFullscreen(false);
    setIsUiHidden(false);
    if (typeof document !== 'undefined') {
      void exitNativeFullscreen(document as FullscreenCapableDocument);
    }
  }, []);

  const handleEnterFullscreen = useCallback(() => {
    clearPendingSingleTap();
    unlockAudioContext();
    setIsSettingsOpen(false);
    isFullscreenRef.current = true;
    setIsFullscreen(true);
    setIsUiHidden(true);
    requestScreenWakeLock();
    if (typeof document !== 'undefined') {
      void requestNativeFullscreen(
        document.documentElement as FullscreenCapableElement
      ).then((enteredNative) => {
        nativeFullscreenActiveRef.current = enteredNative;
      });
    }
  }, [clearPendingSingleTap]);

  const handleToggleFullscreen = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (isFullscreenRef.current) {
        handleExitFullscreen();
      } else {
        handleEnterFullscreen();
      }
    },
    [handleEnterFullscreen, handleExitFullscreen]
  );

  // Keep state synced when browser exits native fullscreen (e.g. OS-handled Esc key)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onFullscreenChange = () => {
      const fsEl = getNativeFullscreenElement(
        document as FullscreenCapableDocument
      );
      if (fsEl) {
        nativeFullscreenActiveRef.current = true;
        isFullscreenRef.current = true;
        setIsFullscreen(true);
      } else if (nativeFullscreenActiveRef.current) {
        nativeFullscreenActiveRef.current = false;
        isFullscreenRef.current = false;
        setIsFullscreen(false);
        setIsUiHidden(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        onFullscreenChange
      );
    };
  }, []);

  // Keyboard shortcuts (Space: Start/Pause or Arm/Stop Alarm, R: Reset, Escape: Exit Fullscreen / Close Settings / Stop Alarm)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isAlarmClockRingingRef.current) {
          handleStopRingingAlarm();
        }
        if (isFullscreenRef.current) {
          handleExitFullscreen();
        }
        setIsSettingsOpen(false);
        return;
      }

      if (isFormField) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsUiHidden(false);
        if (isAlarmClockRingingRef.current) {
          handleStopRingingAlarm();
        } else if (settingsRef.current.mode === ClockMode.AlarmClock) {
          handleToggleAlarmClockArmed();
        } else {
          handleToggleStartPause();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsUiHidden(false);
        if (isAlarmClockRingingRef.current) {
          handleStopRingingAlarm();
        } else if (settingsRef.current.mode === ClockMode.AlarmClock) {
          handleCancelSnooze();
        } else {
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleToggleStartPause,
    handleReset,
    handleStopRingingAlarm,
    handleToggleAlarmClockArmed,
    handleCancelSnooze,
    handleExitFullscreen,
  ]);

  // Settings Handlers
  const handleChangeMode = (mode: ClockMode) => {
    unlockAudioContext();
    if (!isAlarmClockRingingRef.current) {
      stopAlarmSound();
    }
    isRunningRef.current = false;
    setIsRunning(false);
    setIsAlarmBlinking(false);
    setBgFlashEvent(null);

    if (mode === ClockMode.Countdown) {
      countdownRemainingRef.current = countdownTargetToMs(
        settings.countdownTarget
      );
    } else if (mode === ClockMode.TimeUntil) {
      const now = new Date();
      const resolved = resolveNextTargetTimestampMs(
        now,
        settings.timeUntilTarget
      );
      timeUntilEpochMsRef.current = resolved.targetTimestampMs;
      timeUntilRemainingRef.current = Math.max(
        0,
        resolved.targetTimestampMs - now.getTime()
      );
      setIsTimeUntilTomorrow(resolved.isTomorrow);
      isRunningRef.current = true;
      setIsRunning(true);
      requestScreenWakeLock();
    } else if (mode === ClockMode.Interval) {
      const fresh = createInitialIntervalState(settings.intervalConfig);
      intervalStateRef.current = fresh;
      setIntervalState(fresh);
    } else if (mode === ClockMode.Jujitsu) {
      const freshJujitsu = createInitialJujitsuState(settings.jujitsuConfig);
      jujitsuStateRef.current = freshJujitsu;
      setJujitsuState(freshJujitsu);
    } else if (mode === ClockMode.FocusSession) {
      const freshFocus = createInitialFocusState(settings.focusConfig);
      focusStateRef.current = freshFocus;
      setFocusState(freshFocus);
    } else if (mode === ClockMode.AlarmClock) {
      requestScreenWakeLock();
    }

    setSettings((prev) => ({ ...prev, mode }));
  };

  const handleToggleField = (field: TimeFieldKey) => {
    setSettings((prev) => ({
      ...prev,
      visibleFields: toggleVisibleField(prev.visibleFields, field),
    }));
  };

  const handleToggleAutoDim = () => {
    lastActivityMsRef.current = Date.now();
    setIsAutoDimmed(false);
    setSettings((prev) => ({
      ...prev,
      autoDimEnabled: !prev.autoDimEnabled,
    }));
  };

  const handleChangeCountdownTarget = (rawTarget: CountdownTarget) => {
    const clean = sanitizeCountdownTarget(rawTarget);
    setSettings((prev) => ({ ...prev, countdownTarget: clean }));
    if (!isRunningRef.current && settingsRef.current.mode === ClockMode.Countdown) {
      countdownRemainingRef.current = countdownTargetToMs(clean);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeTimeUntilTarget = (rawTarget: TimeUntilTarget) => {
    unlockAudioContext();
    if (!isAlarmClockRingingRef.current) {
      stopAlarmSound();
    }
    const clean = sanitizeTimeUntilTarget(rawTarget);
    const now = new Date();
    const resolved = resolveNextTargetTimestampMs(now, clean);
    timeUntilEpochMsRef.current = resolved.targetTimestampMs;
    timeUntilRemainingRef.current = Math.max(
      0,
      resolved.targetTimestampMs - now.getTime()
    );
    setIsTimeUntilTomorrow(resolved.isTomorrow);
    setIsAlarmBlinking(false);
    setBgFlashEvent(null);
    setSettings((prev) => ({ ...prev, timeUntilTarget: clean }));
    if (settingsRef.current.mode === ClockMode.TimeUntil) {
      isRunningRef.current = true;
      setIsRunning(true);
      requestScreenWakeLock();
    }
  };

  const handleChangeIntervalWork = (rawWork: CountdownTarget) => {
    const cleanConfig = sanitizeIntervalConfig({
      ...settings.intervalConfig,
      work: rawWork,
    });
    setSettings((prev) => ({ ...prev, intervalConfig: cleanConfig }));
    if (!isRunningRef.current && settingsRef.current.mode === ClockMode.Interval) {
      const fresh = createInitialIntervalState(cleanConfig);
      intervalStateRef.current = fresh;
      setIntervalState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeIntervalRest = (rawRest: CountdownTarget) => {
    const cleanConfig = sanitizeIntervalConfig({
      ...settings.intervalConfig,
      rest: rawRest,
    });
    setSettings((prev) => ({ ...prev, intervalConfig: cleanConfig }));
    if (!isRunningRef.current && settingsRef.current.mode === ClockMode.Interval) {
      const fresh = createInitialIntervalState(cleanConfig);
      intervalStateRef.current = fresh;
      setIntervalState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeIntervalCycles = (rawCycles: number) => {
    const cleanConfig = sanitizeIntervalConfig({
      ...settings.intervalConfig,
      cycles: rawCycles,
    });
    setSettings((prev) => ({ ...prev, intervalConfig: cleanConfig }));
    if (!isRunningRef.current && settingsRef.current.mode === ClockMode.Interval) {
      const fresh = createInitialIntervalState(cleanConfig);
      intervalStateRef.current = fresh;
      setIntervalState(fresh);
      setIsAlarmBlinking(false);
    } else if (isRunningRef.current && settingsRef.current.mode === ClockMode.Interval) {
      const updated = {
        ...intervalStateRef.current,
        totalCycles: cleanConfig.cycles,
      };
      intervalStateRef.current = updated;
      setIntervalState(updated);
    }
  };

  const handleChangeJujitsuCountdown = (rawCountdown: CountdownTarget) => {
    const cleanConfig = sanitizeJujitsuConfig({
      ...settings.jujitsuConfig,
      countdown: rawCountdown,
    });
    setSettings((prev) => ({ ...prev, jujitsuConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.Jujitsu
    ) {
      const fresh = createInitialJujitsuState(cleanConfig);
      jujitsuStateRef.current = fresh;
      setJujitsuState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeJujitsuCooldown = (rawCooldown: CountdownTarget) => {
    const cleanConfig = sanitizeJujitsuConfig({
      ...settings.jujitsuConfig,
      cooldown: rawCooldown,
    });
    setSettings((prev) => ({ ...prev, jujitsuConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.Jujitsu
    ) {
      const fresh = createInitialJujitsuState(cleanConfig);
      jujitsuStateRef.current = fresh;
      setJujitsuState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeJujitsuTotalDuration = (rawTotal: CountdownTarget) => {
    const cleanConfig = sanitizeJujitsuConfig({
      ...settings.jujitsuConfig,
      totalDuration: rawTotal,
    });
    setSettings((prev) => ({ ...prev, jujitsuConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.Jujitsu
    ) {
      const fresh = createInitialJujitsuState(cleanConfig);
      jujitsuStateRef.current = fresh;
      setJujitsuState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeJujitsuStartSound = (startSoundId: JujitsuSoundId) => {
    unlockAudioContext();
    const cleanConfig = sanitizeJujitsuConfig({
      ...settings.jujitsuConfig,
      startSoundId,
    });
    setSettings((prev) => ({ ...prev, jujitsuConfig: cleanConfig }));
    if (settingsRef.current.alarmSoundEnabled) {
      playJujitsuStartSound(true, cleanConfig.startSoundId);
    }
  };

  const handleTestJujitsuStartSound = () => {
    unlockAudioContext();
    playJujitsuStartSound(true, settingsRef.current.jujitsuConfig.startSoundId);
  };

  const handleChangeJujitsuStopSound = (stopSoundId: JujitsuSoundId) => {
    unlockAudioContext();
    const cleanConfig = sanitizeJujitsuConfig({
      ...settings.jujitsuConfig,
      stopSoundId,
    });
    setSettings((prev) => ({ ...prev, jujitsuConfig: cleanConfig }));
    if (settingsRef.current.alarmSoundEnabled) {
      playJujitsuStopDoubleSound(true, cleanConfig.stopSoundId);
    }
  };

  const handleTestJujitsuStopSound = () => {
    unlockAudioContext();
    playJujitsuStopDoubleSound(
      true,
      settingsRef.current.jujitsuConfig.stopSoundId
    );
  };

  const handleChangeFocusWork = (rawWork: CountdownTarget) => {
    const cleanConfig = sanitizeFocusConfig({
      ...settings.focusConfig,
      work: rawWork,
    });
    setSettings((prev) => ({ ...prev, focusConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.FocusSession
    ) {
      const fresh = createInitialFocusState(cleanConfig);
      focusStateRef.current = fresh;
      setFocusState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeFocusBreak = (rawBreak: CountdownTarget) => {
    const cleanConfig = sanitizeFocusConfig({
      ...settings.focusConfig,
      breakDuration: rawBreak,
    });
    setSettings((prev) => ({ ...prev, focusConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.FocusSession
    ) {
      const fresh = createInitialFocusState(cleanConfig);
      focusStateRef.current = fresh;
      setFocusState(fresh);
      setIsAlarmBlinking(false);
    }
  };

  const handleChangeFocusSessions = (rawSessions: number) => {
    const cleanConfig = sanitizeFocusConfig({
      ...settings.focusConfig,
      sessions: rawSessions,
    });
    setSettings((prev) => ({ ...prev, focusConfig: cleanConfig }));
    if (
      !isRunningRef.current &&
      settingsRef.current.mode === ClockMode.FocusSession
    ) {
      const fresh = createInitialFocusState(cleanConfig);
      focusStateRef.current = fresh;
      setFocusState(fresh);
      setIsAlarmBlinking(false);
    } else if (
      isRunningRef.current &&
      settingsRef.current.mode === ClockMode.FocusSession
    ) {
      const updated: FocusState = {
        ...focusStateRef.current,
        totalSessions: cleanConfig.sessions,
        completedSessions: Math.min(
          focusStateRef.current.completedSessions,
          cleanConfig.sessions
        ),
      };
      focusStateRef.current = updated;
      setFocusState(updated);
    }
  };

  const handleToggleAlarmSound = () => {
    unlockAudioContext();
    setSettings((prev) => {
      const nextEnabled = !prev.alarmSoundEnabled;
      if (!nextEnabled && !isAlarmClockRingingRef.current) {
        stopAlarmSound();
      }
      return { ...prev, alarmSoundEnabled: nextEnabled };
    });
  };

  const handleChangeAlarmSoundId = (alarmSoundId: AlarmSoundId) => {
    unlockAudioContext();
    setSettings((prev) => ({ ...prev, alarmSoundId }));
    if (settingsRef.current.alarmSoundEnabled) {
      playCompletionAlarm(true, alarmSoundId);
    }
  };

  const handleTestAlarmSound = () => {
    unlockAudioContext();
    playCompletionAlarm(true, settingsRef.current.alarmSoundId);
  };

  const handleToggleTickSound = () => {
    unlockAudioContext();
    setSettings((prev) => {
      const nextEnabled = !prev.tickSoundEnabled;
      if (nextEnabled) {
        playMechanicalTickTock(true, 0);
      }
      return { ...prev, tickSoundEnabled: nextEnabled };
    });
  };

  const handleTestTickSound = () => {
    unlockAudioContext();
    if (tickTestTimerRef.current !== null) {
      window.clearTimeout(tickTestTimerRef.current);
    }
    playMechanicalTickTock(true, 0);
    tickTestTimerRef.current = window.setTimeout(() => {
      tickTestTimerRef.current = null;
      playMechanicalTickTock(true, 1);
    }, 500);
  };

  const handleUpdateMedia = useCallback((patch: Partial<MediaConfig>) => {
    setSettings((prev) => ({
      ...prev,
      media: sanitizeMediaConfig({
        ...prev.media,
        ...patch,
      }),
    }));
  }, []);

  const handlePlayMediaNow = useCallback(() => {
    unlockAudioContext();
    issueMediaCommand('play');
  }, [issueMediaCommand]);

  const handlePauseMediaNow = useCallback(() => {
    issueMediaCommand('pause');
  }, [issueMediaCommand]);

  const handleOpenRadioSettings = useCallback(() => {
    clearPendingSingleTap();
    unlockAudioContext();
    setIsUiHidden(false);
    setRequestedSettingsTab((prev) => ({
      key: (prev?.key ?? 0) + 1,
      tab: 'radio',
    }));
    setIsSettingsOpen(true);
  }, [clearPendingSingleTap]);

  const handleToggleVisualFlash = () => {
    setSettings((prev) => {
      const nextEnabled = !prev.visualFlashEnabled;
      if (!nextEnabled) {
        setBgFlashEvent(null);
      }
      return { ...prev, visualFlashEnabled: nextEnabled };
    });
  };

  const handleTestVisualFlash = () => {
    setBgFlashEvent((prev) => ({
      key: (prev?.key ?? 0) + 1,
      kind: 'complete',
    }));
  };

  const handleToggleVibration = () => {
    setSettings((prev) => {
      const nextEnabled = !prev.vibrationEnabled;
      if (!nextEnabled) {
        stopVibration();
      }
      return { ...prev, vibrationEnabled: nextEnabled };
    });
  };

  const handleTestVibration = () => {
    triggerVibration(true, 'complete');
  };

  const handleToggleDoubleTapReset = () => {
    clearPendingSingleTap();
    setSettings((prev) => ({
      ...prev,
      doubleTapResetEnabled: !prev.doubleTapResetEnabled,
    }));
  };

  const handleSavePreset = (
    name: string,
    category: PresetCategory,
    targetMode: PresetClockMode | ClockMode = settings.mode
  ): { ok: true } | { ok: false; error: string } => {
    const result = createTimerPreset({
      name,
      category,
      mode: targetMode,
      countdownTarget: settings.countdownTarget,
      timeUntilTarget: settings.timeUntilTarget,
      intervalConfig: settings.intervalConfig,
      jujitsuConfig: settings.jujitsuConfig,
      focusConfig: settings.focusConfig,
      alarmClock: settings.alarmClock,
    });
    if (!result.ok) {
      return result;
    }
    setPresets((prev) => [...prev, result.preset]);
    return { ok: true };
  };

  const handleSelectPreset = (preset: SavedTimerPreset) => {
    clearPendingSingleTap();
    stopAlarmSound();
    isRunningRef.current = false;
    setIsRunning(false);
    setIsAlarmBlinking(false);
    isAlarmClockRingingRef.current = false;
    setIsAlarmClockRinging(false);
    setSnoozeUntilMs(null);
    setSnoozeRemainingMs(null);
    setBgFlashEvent(null);

    if (preset.mode === ClockMode.Countdown && preset.countdownTarget) {
      const cleanTarget = sanitizeCountdownTarget(preset.countdownTarget);
      countdownRemainingRef.current = countdownTargetToMs(cleanTarget);
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.Countdown,
        countdownTarget: cleanTarget,
      }));
    } else if (preset.mode === ClockMode.TimeUntil && preset.timeUntilTarget) {
      const cleanTarget = sanitizeTimeUntilTarget(preset.timeUntilTarget);
      const now = new Date();
      const resolved = resolveNextTargetTimestampMs(now, cleanTarget);
      timeUntilEpochMsRef.current = resolved.targetTimestampMs;
      timeUntilRemainingRef.current = Math.max(
        0,
        resolved.targetTimestampMs - now.getTime()
      );
      setIsTimeUntilTomorrow(resolved.isTomorrow);
      isRunningRef.current = true;
      setIsRunning(true);
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.TimeUntil,
        timeUntilTarget: cleanTarget,
      }));
      requestScreenWakeLock();
    } else if (preset.mode === ClockMode.Interval && preset.intervalConfig) {
      const cleanInterval = sanitizeIntervalConfig(preset.intervalConfig);
      const freshState = createInitialIntervalState(cleanInterval);
      intervalStateRef.current = freshState;
      setIntervalState(freshState);
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.Interval,
        intervalConfig: cleanInterval,
      }));
    } else if (preset.mode === ClockMode.Jujitsu && preset.jujitsuConfig) {
      const cleanJujitsu = sanitizeJujitsuConfig(preset.jujitsuConfig);
      const freshJujitsu = createInitialJujitsuState(cleanJujitsu);
      jujitsuStateRef.current = freshJujitsu;
      setJujitsuState(freshJujitsu);
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.Jujitsu,
        jujitsuConfig: cleanJujitsu,
      }));
    } else if (preset.mode === ClockMode.FocusSession && preset.focusConfig) {
      const cleanFocus = sanitizeFocusConfig(preset.focusConfig);
      const freshFocus = createInitialFocusState(cleanFocus);
      focusStateRef.current = freshFocus;
      setFocusState(freshFocus);
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.FocusSession,
        focusConfig: cleanFocus,
      }));
    } else if (preset.mode === ClockMode.AlarmClock && preset.alarmTime) {
      const cleanAlarm = sanitizeAlarmClockConfig({
        enabled: true,
        hh: preset.alarmTime.hh,
        mm: preset.alarmTime.mm,
        ss: preset.alarmTime.ss,
      });
      alarmArmedAtMsRef.current = Date.now();
      lastFiredAlarmScheduleMsRef.current = null;
      setSettings((prev) => ({
        ...prev,
        mode: ClockMode.AlarmClock,
        alarmClock: cleanAlarm,
      }));
      requestScreenWakeLock();
    }
  };

  const handleDeletePreset = (presetId: string) => {
    setPresets((prev) => prev.filter((item) => item.id !== presetId));
  };

  const beginRightSwipeGesture = (clientX: number, clientY: number) => {
    if (!isFullscreenRef.current || isSettingsOpenRef.current) {
      rightSwipeStartRef.current = null;
      return;
    }
    rightSwipeStartRef.current = {
      x: clientX,
      y: clientY,
      startedAtMs: performance.now(),
    };
  };

  const completeRightSwipeGesture = (clientX: number, clientY: number) => {
    const start = rightSwipeStartRef.current;
    rightSwipeStartRef.current = null;
    if (!start || !isFullscreenRef.current || isSettingsOpenRef.current) {
      return;
    }
    const matched = isExitFullscreenRightSwipe({
      startX: start.x,
      startY: start.y,
      endX: clientX,
      endY: clientY,
      durationMs: Math.max(10, performance.now() - start.startedAtMs),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    if (matched) {
      clearPendingSingleTap();
      suppressNextClockClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClockClickRef.current = false;
      }, 400);
      handleExitFullscreen();
    }
  };

  const handleClockAreaClick = () => {
    if (suppressNextClockClickRef.current) {
      suppressNextClockClickRef.current = false;
      return;
    }
    maybeEnterStandaloneNativeFullscreen();
    unlockAudioContext();
    if (isAlarmClockRingingRef.current) {
      handleStopRingingAlarm();
      return;
    }

    stopAlarmSound();
    setBgFlashEvent(null);

    const decision = evaluateClockTap({
      nowMs: performance.now(),
      lastTapMs: lastTapTimeRef.current,
      doubleTapResetEnabled: settingsRef.current.doubleTapResetEnabled,
      mode: settingsRef.current.mode,
      isSettingsOpen,
    });

    if (decision.action === 'close-settings') {
      clearPendingSingleTap();
      setIsSettingsOpen(false);
      return;
    }

    if (decision.action === 'immediate-toggle-ui') {
      clearPendingSingleTap();
      setIsUiHidden((prev) => !prev);
      return;
    }

    if (decision.action === 'immediate-toggle-timer') {
      clearPendingSingleTap();
      handleToggleStartPause();
      return;
    }

    if (decision.action === 'double-tap-reset') {
      clearPendingSingleTap();
      lastDoubleResetMsRef.current = performance.now();
      handleReset();
      setPhaseFlashKey((k) => k + 1);
      return;
    }

    // 'defer-toggle-timer': wait briefly to see if a second tap completes a double-tap reset
    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
    }
    lastTapTimeRef.current = decision.nextLastTapMs;
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      lastTapTimeRef.current = null;
      handleToggleStartPause();
    }, DOUBLE_TAP_THRESHOLD_MS);
  };

  const handleClockAreaDoubleClick = () => {
    if (isSettingsOpenRef.current || isAlarmClockRingingRef.current) return;
    if (!isTimerClockMode(settingsRef.current.mode)) return;
    if (!settingsRef.current.doubleTapResetEnabled) return;

    clearPendingSingleTap();
    const now = performance.now();
    if (now - lastDoubleResetMsRef.current > 350) {
      lastDoubleResetMsRef.current = now;
      handleReset();
      setPhaseFlashKey((k) => k + 1);
    }
  };

  const handleToggleSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    clearPendingSingleTap();
    unlockAudioContext();
    setIsUiHidden(false);
    setIsSettingsOpen((prev) => !prev);
  };

  const initialDisplayText = getStaticDisplayText(
    settings,
    intervalState,
    focusState,
    jujitsuState
  );

  return (
    <div
      data-testid="clock-canvas"
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          beginRightSwipeGesture(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={(e) => {
        if (e.changedTouches.length > 0) {
          completeRightSwipeGesture(
            e.changedTouches[0].clientX,
            e.changedTouches[0].clientY
          );
        }
      }}
      onTouchCancel={() => {
        rightSwipeStartRef.current = null;
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') {
          beginRightSwipeGesture(e.clientX, e.clientY);
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'touch') {
          completeRightSwipeGesture(e.clientX, e.clientY);
        }
      }}
      onPointerCancel={() => {
        rightSwipeStartRef.current = null;
      }}
      className={`clock-canvas relative h-dvh w-screen overflow-hidden ${
        isFullscreen && !isSettingsOpen ? 'touch-none' : ''
      }`}
    >
      <CornerControls
        mode={settings.mode}
        showBatteryLevel={settings.showBatteryLevel}
        showRadioControl={settings.showRadioControl}
        showJujitsuQuickStart={settings.showJujitsuQuickStart}
        jujitsuConfig={settings.jujitsuConfig}
        isRunning={isRunning}
        isAlarmArmed={settings.alarmClock.enabled}
        isAlarmRinging={isAlarmClockRinging}
        isAlarmSnoozed={snoozeUntilMs !== null}
        isSettingsOpen={isSettingsOpen}
        isFullscreen={isFullscreen}
        isUiHidden={isUiHidden}
        isAutoDimmed={isAutoDimmed}
        onToggleStartPause={handleToggleStartPause}
        onReset={handleReset}
        onQuickStartJujitsu={handleQuickStartJujitsu}
        onToggleAlarmArmed={handleToggleAlarmClockArmed}
        onCancelSnooze={handleCancelSnooze}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleSettings={handleToggleSettings}
      />

      <ClockRadioDeck
        media={settings.media}
        showRadioControl={settings.showRadioControl}
        gradualAlarmVolume={settings.gradualAlarmVolume}
        isUiHidden={isUiHidden}
        isAutoDimmed={isAutoDimmed}
        isSettingsOpen={isSettingsOpen}
        playbackCommand={mediaCommand}
        onChangeVolume={(volume) => handleUpdateMedia({ volume })}
        onOpenRadioSettings={handleOpenRadioSettings}
        onWakeStreamFallback={handleWakeStreamFallback}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        requestedTab={requestedSettingsTab}
        settings={settings}
        focusState={focusState}
        presets={presets}
        isFullscreen={isFullscreen}
        isAlarmSnoozed={snoozeUntilMs !== null}
        isMidnightScheduledActive={scheduledTheme.isMidnightScheduledActive}
        solarTimes={scheduledTheme.solar}
        solarGeoStatus={solarGeoStatus}
        solarGeoError={solarGeoError}
        onClose={() => setIsSettingsOpen(false)}
        onChangeMode={handleChangeMode}
        onChangeLiveClockTimezone={(liveClockTimezone) =>
          setSettings((prev) => ({ ...prev, liveClockTimezone }))
        }
        onToggleField={handleToggleField}
        onToggleShowDate={() =>
          setSettings((prev) => ({
            ...prev,
            showDate: !prev.showDate,
          }))
        }
        onToggleSessionElapsed={() =>
          setSettings((prev) => ({
            ...prev,
            showSessionElapsed: !prev.showSessionElapsed,
          }))
        }
        onToggleShowRadioControl={() =>
          setSettings((prev) => ({
            ...prev,
            showRadioControl: !prev.showRadioControl,
          }))
        }
        onToggleShowJujitsuQuickStart={() =>
          setSettings((prev) => ({
            ...prev,
            showJujitsuQuickStart: !prev.showJujitsuQuickStart,
          }))
        }
        onToggleShowBatteryLevel={() =>
          setSettings((prev) => ({
            ...prev,
            showBatteryLevel: !prev.showBatteryLevel,
          }))
        }
        onToggleAutoDim={handleToggleAutoDim}
        onToggleAutoFullscreenWebApp={() =>
          setSettings((prev) => ({
            ...prev,
            autoFullscreenWebApp: !prev.autoFullscreenWebApp,
          }))
        }
        onEnterFullscreenNow={handleEnterFullscreen}
        onChangeCountdownTarget={handleChangeCountdownTarget}
        onChangeTimeUntilTarget={handleChangeTimeUntilTarget}
        onChangeIntervalWork={handleChangeIntervalWork}
        onChangeIntervalRest={handleChangeIntervalRest}
        onChangeIntervalCycles={handleChangeIntervalCycles}
        onChangeJujitsuCountdown={handleChangeJujitsuCountdown}
        onChangeJujitsuCooldown={handleChangeJujitsuCooldown}
        onChangeJujitsuTotalDuration={handleChangeJujitsuTotalDuration}
        onChangeJujitsuStartSound={handleChangeJujitsuStartSound}
        onTestJujitsuStartSound={handleTestJujitsuStartSound}
        onChangeJujitsuStopSound={handleChangeJujitsuStopSound}
        onTestJujitsuStopSound={handleTestJujitsuStopSound}
        onChangeFocusWork={handleChangeFocusWork}
        onChangeFocusBreak={handleChangeFocusBreak}
        onChangeFocusSessions={handleChangeFocusSessions}
        onChangeAlarmTime={handleChangeAlarmTime}
        onToggleAlarmClockArmed={handleToggleAlarmClockArmed}
        onUpdateMedia={handleUpdateMedia}
        onPlayMediaNow={handlePlayMediaNow}
        onPauseMediaNow={handlePauseMediaNow}
        onSavePreset={handleSavePreset}
        onSelectPreset={handleSelectPreset}
        onDeletePreset={handleDeletePreset}
        onToggleAlarmSound={handleToggleAlarmSound}
        onChangeAlarmSoundId={handleChangeAlarmSoundId}
        onTestAlarmSound={handleTestAlarmSound}
        onToggleGradualAlarmVolume={() =>
          setSettings((prev) => ({
            ...prev,
            gradualAlarmVolume: !prev.gradualAlarmVolume,
          }))
        }
        onToggleTickSound={handleToggleTickSound}
        onTestTickSound={handleTestTickSound}
        onToggleVisualFlash={handleToggleVisualFlash}
        onTestVisualFlash={handleTestVisualFlash}
        onToggleVibration={handleToggleVibration}
        onTestVibration={handleTestVibration}
        onToggleDoubleTapReset={handleToggleDoubleTapReset}
        onChangeFont={(fontId) => setSettings((prev) => ({ ...prev, fontId }))}
        onChangeSize={(clockSizeVw) =>
          setSettings((prev) => ({ ...prev, clockSizeVw }))
        }
        onChangeClockColor={(clockColor) =>
          setSettings((prev) => ({ ...prev, clockColor }))
        }
        onChangeBgColor={(bgColor) =>
          setSettings((prev) => ({ ...prev, bgColor }))
        }
        onApplyPreset={(clockColor, bgColor) =>
          setSettings((prev) => ({ ...prev, clockColor, bgColor }))
        }
        onToggleSolarSchedule={handleToggleSolarSchedule}
        onRefreshSolarLocation={() => requestBrowserGeolocation(true)}
      />

      <ClockFace
        displayRef={displayRef}
        initialText={initialDisplayText}
        mode={settings.mode}
        liveClockTimezone={settings.liveClockTimezone}
        showDate={settings.showDate}
        calendarDateText={calendarDateText}
        showSessionElapsed={settings.showSessionElapsed}
        sessionElapsedText={sessionElapsedText}
        isAutoDimmed={isAutoDimmed}
        intervalState={intervalState}
        jujitsuState={jujitsuState}
        focusState={focusState}
        alarmClock={settings.alarmClock}
        timeUntilTarget={settings.timeUntilTarget}
        isTimeUntilTomorrow={isTimeUntilTomorrow}
        isAlarmBlinking={isAlarmBlinking}
        isAlarmClockRinging={isAlarmClockRinging}
        snoozeRemainingMs={snoozeRemainingMs}
        phaseFlashKey={phaseFlashKey}
        bgFlashEvent={bgFlashEvent}
        onClockAreaClick={handleClockAreaClick}
        onClockAreaDoubleClick={handleClockAreaDoubleClick}
        onStopRingingAlarm={handleStopRingingAlarm}
        onSnoozeRingingAlarm={handleSnoozeRingingAlarm}
      />
    </div>
  );
}
