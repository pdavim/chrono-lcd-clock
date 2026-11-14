import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALARM_SOUND_OPTIONS,
  AUTO_DIM_INACTIVITY_MS,
  COLOR_PRESETS,
  ClockMode,
  DEFAULT_SETTINGS,
  FocusPhase,
  FontOptionId,
  IntervalPhase,
  JUJITSU_SOUND_OPTIONS,
  JujitsuPhase,
  JujitsuSoundId,
  LiveClockTimezone,
  advanceFocusPhase,
  advanceIntervalPhase,
  buildDisplayString,
  computeMsUntilAlarm,
  computeMsUntilTargetTime,
  countdownTargetToMs,
  createInitialFocusState,
  createInitialIntervalState,
  createInitialJujitsuState,
  decomposeDurationMs,
  estimateDisplayWidthEm,
  evaluateAlarmClockTick,
  evaluateClockTap,
  formatAlarmTimeLabel,
  formatCalendarDateDdMmYyyy,
  formatDurationMs,
  formatLiveClockDate,
  formatRemainingTimeBrief,
  formatSessionElapsedHhMmSs,
  formatTimeUntilLabel,
  resolveNextTargetTimestampMs,
  sanitizeAlarmClockConfig,
  sanitizeCountdownTarget,
  sanitizeFocusConfig,
  sanitizeIntervalConfig,
  sanitizeJujitsuConfig,
  sanitizeTimeUntilTarget,
  shouldAutoDimDisplay,
  shouldShowJujitsuQuickStart,
  shouldShowRadioControlBar,
  stepFocusState,
  stepIntervalState,
  stepJujitsuState,
  toggleVisibleField,
} from './time';

test('decomposeDurationMs converts milliseconds into hh, mm, ss, ms accurately', () => {
  assert.deepEqual(decomposeDurationMs(0), { hh: 0, mm: 0, ss: 0, ms: 0 });
  assert.deepEqual(decomposeDurationMs(-250), { hh: 0, mm: 0, ss: 0, ms: 0 });
  assert.deepEqual(decomposeDurationMs(3_723_456), {
    hh: 1,
    mm: 2,
    ss: 3,
    ms: 456,
  });
});

test('formatDurationMs respects HH, MM, SS, MS field toggles', () => {
  const sampleMs = (2 * 3600 + 9 * 60 + 4) * 1000 + 75;
  assert.equal(
    formatDurationMs(sampleMs, { hh: true, mm: true, ss: true, ms: true }),
    '02:09:04:075'
  );
  assert.equal(
    formatDurationMs(sampleMs, { hh: false, mm: true, ss: true, ms: false }),
    '09:04'
  );
  assert.equal(
    formatDurationMs(sampleMs, { hh: false, mm: false, ss: true, ms: true }),
    '04:075'
  );
  assert.equal(
    formatDurationMs(sampleMs, { hh: false, mm: false, ss: false, ms: true }),
    '075'
  );
});

test('toggleVisibleField prevents disabling the last active field', () => {
  const initial = { hh: true, mm: true, ss: true, ms: true };
  const step1 = toggleVisibleField(initial, 'hh');
  assert.deepEqual(step1, { hh: false, mm: true, ss: true, ms: true });

  const step2 = toggleVisibleField(step1, 'mm');
  const step3 = toggleVisibleField(step2, 'ms');
  assert.deepEqual(step3, { hh: false, mm: false, ss: true, ms: false });

  // Attempting to turn off the final active field ('ss') must keep it enabled
  const blocked = toggleVisibleField(step3, 'ss');
  assert.deepEqual(blocked, { hh: false, mm: false, ss: true, ms: false });

  // Re-enabling another field still works
  const reenabled = toggleVisibleField(blocked, 'ms');
  assert.deepEqual(reenabled, { hh: false, mm: false, ss: true, ms: true });
});

test('sanitizeCountdownTarget and countdownTargetToMs clamp bounds properly', () => {
  const clean = sanitizeCountdownTarget({ hh: 120, mm: 75, ss: -5 });
  assert.deepEqual(clean, { hh: 99, mm: 59, ss: 0 });
  assert.equal(countdownTargetToMs({ hh: 0, mm: 5, ss: 30 }), 330_000);
  assert.equal(countdownTargetToMs({ hh: 1, mm: 0, ss: 0 }), 3_600_000);
});

test('interval training alternates work and rest across configured cycles and completes', () => {
  const config = sanitizeIntervalConfig({
    work: { hh: 0, mm: 0, ss: 10 },
    rest: { hh: 0, mm: 0, ss: 5 },
    cycles: 2,
  });

  const s0 = createInitialIntervalState(config);
  assert.equal(s0.phase, IntervalPhase.Work);
  assert.equal(s0.currentCycle, 1);
  assert.equal(s0.remainingMs, 10_000);

  // Finish Work 1 -> enters Rest 1
  const t1 = advanceIntervalPhase(s0, config);
  assert.equal(t1.event, 'rest-started');
  assert.equal(t1.nextState.phase, IntervalPhase.Rest);
  assert.equal(t1.nextState.currentCycle, 1);
  assert.equal(t1.nextState.remainingMs, 5_000);

  // Finish Rest 1 -> enters Work 2
  const t2 = advanceIntervalPhase(t1.nextState, config);
  assert.equal(t2.event, 'work-started');
  assert.equal(t2.nextState.phase, IntervalPhase.Work);
  assert.equal(t2.nextState.currentCycle, 2);
  assert.equal(t2.nextState.remainingMs, 10_000);

  // Finish Work 2 -> enters Rest 2
  const t3 = advanceIntervalPhase(t2.nextState, config);
  assert.equal(t3.event, 'rest-started');
  assert.equal(t3.nextState.phase, IntervalPhase.Rest);
  assert.equal(t3.nextState.currentCycle, 2);

  // Finish Rest 2 -> Completed
  const t4 = advanceIntervalPhase(t3.nextState, config);
  assert.equal(t4.event, 'completed');
  assert.equal(t4.nextState.phase, IntervalPhase.Completed);
  assert.equal(t4.nextState.remainingMs, 0);
});

test('stepIntervalState handles exact and overshoot frame deltas seamlessly', () => {
  const config = sanitizeIntervalConfig({
    work: { hh: 0, mm: 0, ss: 2 },
    rest: { hh: 0, mm: 0, ss: 1 },
    cycles: 2,
  });

  const initial = createInitialIntervalState(config);
  // Advance 2500ms: completes 2000ms Work 1 and consumes 500ms of Rest 1
  const step1 = stepIntervalState(initial, config, 2500);
  assert.deepEqual(step1.events, ['rest-started']);
  assert.equal(step1.nextState.phase, IntervalPhase.Rest);
  assert.equal(step1.nextState.currentCycle, 1);
  assert.equal(step1.nextState.remainingMs, 500);

  // Advance remaining 3500ms (500ms Rest 1 + 2000ms Work 2 + 1000ms Rest 2) -> Completed
  const step2 = stepIntervalState(step1.nextState, config, 3500);
  assert.deepEqual(step2.events, ['work-started', 'rest-started', 'completed']);
  assert.equal(step2.nextState.phase, IntervalPhase.Completed);
  assert.equal(step2.nextState.remainingMs, 0);
});

test('sanitizeIntervalConfig enforces minimum 1s work and allows 0s rest', () => {
  const zeroWorkConfig = sanitizeIntervalConfig({
    work: { hh: 0, mm: 0, ss: 0 },
    rest: { hh: 0, mm: 0, ss: 0 },
    cycles: 2,
  });
  assert.equal(countdownTargetToMs(zeroWorkConfig.work), 1000);
  assert.equal(countdownTargetToMs(zeroWorkConfig.rest), 0);

  const s0 = createInitialIntervalState(zeroWorkConfig);
  const t1 = advanceIntervalPhase(s0, zeroWorkConfig);
  assert.equal(t1.event, 'work-started');
  assert.equal(t1.nextState.currentCycle, 2);
});

test('formatLiveClockDate and estimateDisplayWidthEm behave consistently across Local and UTC', () => {
  const localDate = new Date(2026, 10, 10, 14, 5, 9, 42);
  assert.equal(
    formatLiveClockDate(
      localDate,
      { hh: true, mm: true, ss: true, ms: true },
      LiveClockTimezone.Local
    ),
    '14:05:09:042'
  );

  const utcSample = new Date(Date.UTC(2026, 10, 10, 22, 30, 15, 7));
  assert.equal(
    formatLiveClockDate(
      utcSample,
      { hh: true, mm: true, ss: true, ms: true },
      LiveClockTimezone.UTC
    ),
    '22:30:15:007'
  );
  assert.equal(
    formatLiveClockDate(
      utcSample,
      { hh: true, mm: true, ss: false, ms: false },
      LiveClockTimezone.UTC
    ),
    '22:30'
  );

  const fullWidth = estimateDisplayWidthEm(
    { hh: true, mm: true, ss: true, ms: true },
    FontOptionId.Timex7Seg
  );
  const compactWidth = estimateDisplayWidthEm(
    { hh: false, mm: true, ss: true, ms: false },
    FontOptionId.Timex7Seg
  );
  assert.ok(fullWidth > compactWidth);
  assert.equal(ClockMode.Interval, 'interval');
  assert.equal(
    buildDisplayString(
      { hh: 0, mm: 0, ss: 7, ms: 0 },
      { hh: false, mm: false, ss: false, ms: false }
    ),
    '07'
  );
});

test('evaluateClockTap distinguishes single taps, double-tap resets, and disabled states', () => {
  // Settings open always closes settings first
  assert.deepEqual(
    evaluateClockTap({
      nowMs: 1000,
      lastTapMs: null,
      doubleTapResetEnabled: true,
      mode: ClockMode.Stopwatch,
      isSettingsOpen: true,
    }),
    { action: 'close-settings', nextLastTapMs: null }
  );

  // Disabled option performs immediate single-tap UI toggle
  assert.deepEqual(
    evaluateClockTap({
      nowMs: 1000,
      lastTapMs: 900,
      doubleTapResetEnabled: false,
      mode: ClockMode.Stopwatch,
      isSettingsOpen: false,
    }),
    { action: 'immediate-single-tap', nextLastTapMs: null }
  );

  // LiveClock mode ignores double-tap reset and toggles UI immediately
  assert.deepEqual(
    evaluateClockTap({
      nowMs: 1000,
      lastTapMs: 900,
      doubleTapResetEnabled: true,
      mode: ClockMode.LiveClock,
      isSettingsOpen: false,
    }),
    { action: 'immediate-single-tap', nextLastTapMs: null }
  );

  // First tap when enabled defers single-tap to wait for potential second tap
  const tap1 = evaluateClockTap({
    nowMs: 1000,
    lastTapMs: null,
    doubleTapResetEnabled: true,
    mode: ClockMode.Countdown,
    isSettingsOpen: false,
  });
  assert.deepEqual(tap1, { action: 'defer-single-tap', nextLastTapMs: 1000 });

  // Second tap within 280ms triggers double-tap-reset and clears lastTapMs
  const tap2 = evaluateClockTap({
    nowMs: 1180,
    lastTapMs: tap1.nextLastTapMs,
    doubleTapResetEnabled: true,
    mode: ClockMode.Countdown,
    isSettingsOpen: false,
  });
  assert.deepEqual(tap2, { action: 'double-tap-reset', nextLastTapMs: null });

  // Second tap beyond 280ms starts a new deferred single-tap window
  const slowSecondTap = evaluateClockTap({
    nowMs: 1450,
    lastTapMs: 1000,
    doubleTapResetEnabled: true,
    mode: ClockMode.Countdown,
    isSettingsOpen: false,
  });
  assert.deepEqual(slowSecondTap, {
    action: 'defer-single-tap',
    nextLastTapMs: 1450,
  });

  // AlarmClock mode toggles UI immediately on single tap without reset deferral
  assert.deepEqual(
    evaluateClockTap({
      nowMs: 1000,
      lastTapMs: 920,
      doubleTapResetEnabled: true,
      mode: ClockMode.AlarmClock,
      isSettingsOpen: false,
    }),
    { action: 'immediate-single-tap', nextLastTapMs: null }
  );
});

test('Alarm Clock formatting, countdown calculation, and trigger evaluation work accurately', () => {
  assert.equal(ALARM_SOUND_OPTIONS.length, 4);

  const clean = sanitizeAlarmClockConfig({ enabled: true, hh: 27, mm: -4, ss: 90 });
  assert.deepEqual(clean, { enabled: true, hh: 23, mm: 0, ss: 59 });
  assert.equal(formatAlarmTimeLabel({ hh: 7, mm: 5, ss: 0 }), '07:05');
  assert.equal(formatAlarmTimeLabel({ hh: 7, mm: 5, ss: 15 }), '07:05:15');

  const morning = new Date(2026, 10, 10, 6, 30, 0, 0);
  const msSameDay = computeMsUntilAlarm(morning, { hh: 7, mm: 0, ss: 0 });
  assert.equal(msSameDay, 30 * 60 * 1000);
  assert.equal(formatRemainingTimeBrief(msSameDay), '30m');

  // When alarm time has already passed today, schedules for tomorrow (+23h 30m)
  const afterAlarm = new Date(2026, 10, 10, 7, 30, 0, 0);
  const msNextDay = computeMsUntilAlarm(afterAlarm, { hh: 7, mm: 0, ss: 0 });
  assert.equal(msNextDay, (23 * 3600 + 30 * 60) * 1000);
  assert.equal(formatRemainingTimeBrief(msNextDay), '23h 30m');

  // Armed before target second -> triggers once at target second, not twice
  const armedAt = new Date(2026, 10, 10, 7, 0, 5, 0).getTime();
  const targetConfig = { enabled: true, hh: 7, mm: 0, ss: 10 };

  const beforeTick = evaluateAlarmClockTick({
    now: new Date(2026, 10, 10, 7, 0, 9, 800),
    config: targetConfig,
    armedAtMs: armedAt,
    lastFiredScheduleMs: null,
    snoozeUntilMs: null,
  });
  assert.equal(beforeTick.shouldTrigger, false);

  const onTimeTick = evaluateAlarmClockTick({
    now: new Date(2026, 10, 10, 7, 0, 10, 150),
    config: targetConfig,
    armedAtMs: armedAt,
    lastFiredScheduleMs: null,
    snoozeUntilMs: null,
  });
  assert.equal(onTimeTick.shouldTrigger, true);
  assert.ok(onTimeTick.nextLastFiredScheduleMs !== null);

  // Subsequent tick in same window must not re-fire
  const duplicateTick = evaluateAlarmClockTick({
    now: new Date(2026, 10, 10, 7, 0, 10, 600),
    config: targetConfig,
    armedAtMs: armedAt,
    lastFiredScheduleMs: onTimeTick.nextLastFiredScheduleMs,
    snoozeUntilMs: null,
  });
  assert.equal(duplicateTick.shouldTrigger, false);

  // Snooze expiry triggers even if base schedule already fired today
  const snoozeTarget = new Date(2026, 10, 10, 7, 5, 10, 0).getTime();
  const snoozeTick = evaluateAlarmClockTick({
    now: new Date(snoozeTarget + 50),
    config: targetConfig,
    armedAtMs: armedAt,
    lastFiredScheduleMs: onTimeTick.nextLastFiredScheduleMs,
    snoozeUntilMs: snoozeTarget,
  });
  assert.equal(snoozeTick.shouldTrigger, true);
  assert.equal(snoozeTick.nextSnoozeUntilMs, null);
});

test('formatSessionElapsedHhMmSs formats HH:MM:SS and COLOR_PRESETS includes Midnight theme', () => {
  assert.equal(formatSessionElapsedHhMmSs(0), '00:00:00');
  assert.equal(formatSessionElapsedHhMmSs(65_432), '00:01:05');
  assert.equal(formatSessionElapsedHhMmSs(3_661_999), '01:01:01');

  const midnight = COLOR_PRESETS.find((p) => p.id === 'midnight');
  assert.ok(midnight);
  assert.equal(midnight.label, 'Midnight');
  assert.equal(midnight.bgColor, '#050a14');
  assert.equal(midnight.clockColor, '#ffb400');
});

test('Focus Session defaults to 25m work / 5m break and tracks completed Pomodoro cycles', () => {
  assert.deepEqual(DEFAULT_SETTINGS.focusConfig, {
    work: { hh: 0, mm: 25, ss: 0 },
    breakDuration: { hh: 0, mm: 5, ss: 0 },
    sessions: 4,
  });

  const config = sanitizeFocusConfig({
    work: { hh: 0, mm: 0, ss: 2 },
    breakDuration: { hh: 0, mm: 0, ss: 1 },
    sessions: 2,
  });

  const s0 = createInitialFocusState(config);
  assert.equal(s0.phase, FocusPhase.Focus);
  assert.equal(s0.currentSession, 1);
  assert.equal(s0.totalSessions, 2);
  assert.equal(s0.completedSessions, 0);
  assert.equal(s0.remainingMs, 2000);

  // Finish Focus 1 -> completedSessions becomes 1 and enters Break 1
  const step1 = stepFocusState(s0, config, 2200);
  assert.deepEqual(step1.events, ['break-started']);
  assert.equal(step1.nextState.phase, FocusPhase.Break);
  assert.equal(step1.nextState.currentSession, 1);
  assert.equal(step1.nextState.completedSessions, 1);
  assert.equal(step1.nextState.remainingMs, 800);

  // Finish Break 1 -> enters Focus 2 with completedSessions still 1
  const step2 = stepFocusState(step1.nextState, config, 900);
  assert.deepEqual(step2.events, ['focus-started']);
  assert.equal(step2.nextState.phase, FocusPhase.Focus);
  assert.equal(step2.nextState.currentSession, 2);
  assert.equal(step2.nextState.completedSessions, 1);
  assert.equal(step2.nextState.remainingMs, 1900);

  // Finish Focus 2 + Break 2 -> Completed with 2 of 2 sessions done
  const step3 = stepFocusState(step2.nextState, config, 2900);
  assert.deepEqual(step3.events, ['break-started', 'completed']);
  assert.equal(step3.nextState.phase, FocusPhase.Completed);
  assert.equal(step3.nextState.completedSessions, 2);
  assert.equal(step3.nextState.remainingMs, 0);

  // Zero-second break skips directly to next Focus session
  const zeroBreakConfig = sanitizeFocusConfig({
    work: { hh: 0, mm: 0, ss: 0 },
    breakDuration: { hh: 0, mm: 0, ss: 0 },
    sessions: 2,
  });
  assert.equal(countdownTargetToMs(zeroBreakConfig.work), 1000);
  const zb0 = createInitialFocusState(zeroBreakConfig);
  const zb1 = advanceFocusPhase(zb0, zeroBreakConfig);
  assert.equal(zb1.event, 'focus-started');
  assert.equal(zb1.nextState.currentSession, 2);
  assert.equal(zb1.nextState.completedSessions, 1);
});

test('shouldAutoDimDisplay dims after 30s inactivity and suppresses dim during settings or alarms', () => {
  assert.equal(AUTO_DIM_INACTIVITY_MS, 30_000);

  // Below 30s threshold -> stays bright
  assert.equal(
    shouldAutoDimDisplay({
      autoDimEnabled: true,
      nowMs: 39_999,
      lastActivityMs: 10_000,
      isSettingsOpen: false,
      isAlarmActive: false,
    }),
    false
  );

  // At or above 30s threshold -> dims
  assert.equal(
    shouldAutoDimDisplay({
      autoDimEnabled: true,
      nowMs: 40_000,
      lastActivityMs: 10_000,
      isSettingsOpen: false,
      isAlarmActive: false,
    }),
    true
  );

  // Disabled in settings -> never dims
  assert.equal(
    shouldAutoDimDisplay({
      autoDimEnabled: false,
      nowMs: 90_000,
      lastActivityMs: 10_000,
      isSettingsOpen: false,
      isAlarmActive: false,
    }),
    false
  );

  // Settings drawer open -> never dims
  assert.equal(
    shouldAutoDimDisplay({
      autoDimEnabled: true,
      nowMs: 90_000,
      lastActivityMs: 10_000,
      isSettingsOpen: true,
      isAlarmActive: false,
    }),
    false
  );

  // Active alarm blinking/ringing -> never dims
  assert.equal(
    shouldAutoDimDisplay({
      autoDimEnabled: true,
      nowMs: 90_000,
      lastActivityMs: 10_000,
      isSettingsOpen: false,
      isAlarmActive: true,
    }),
    false
  );
});

test('formatCalendarDateDdMmYyyy formats DD/MM/YYYY in Local and UTC timezones', () => {
  assert.equal(DEFAULT_SETTINGS.showDate, false);

  const localSample = new Date(2026, 2, 5, 14, 30, 0);
  assert.equal(
    formatCalendarDateDdMmYyyy(localSample, LiveClockTimezone.Local),
    '05/03/2026'
  );

  const utcSample = new Date(Date.UTC(2026, 10, 11, 23, 45, 0));
  assert.equal(
    formatCalendarDateDdMmYyyy(utcSample, LiveClockTimezone.UTC),
    '11/11/2026'
  );
});

test('shouldShowRadioControlBar respects Display toggle, UI hide, and Settings modal states', () => {
  assert.equal(DEFAULT_SETTINGS.showRadioControl, true);

  assert.equal(
    shouldShowRadioControlBar({
      showRadioControl: true,
      isUiHidden: false,
      isSettingsOpen: false,
    }),
    true
  );

  assert.equal(
    shouldShowRadioControlBar({
      showRadioControl: false,
      isUiHidden: false,
      isSettingsOpen: false,
    }),
    false
  );

  assert.equal(
    shouldShowRadioControlBar({
      showRadioControl: true,
      isUiHidden: true,
      isSettingsOpen: false,
    }),
    false
  );

  assert.equal(
    shouldShowRadioControlBar({
      showRadioControl: true,
      isUiHidden: false,
      isSettingsOpen: true,
    }),
    false
  );
});

test('TimeUntil mode calculates exact remaining ms for same-day and next-day future targets', () => {
  assert.equal(ClockMode.TimeUntil, 'time-until');
  assert.deepEqual(DEFAULT_SETTINGS.timeUntilTarget, { hh: 17, mm: 0, ss: 0 });

  const clamped = sanitizeTimeUntilTarget({ hh: 29, mm: -3, ss: 88 });
  assert.deepEqual(clamped, { hh: 23, mm: 0, ss: 59 });
  assert.equal(formatTimeUntilLabel({ hh: 9, mm: 5, ss: 3 }), '09:05:03');

  // Same-day future target: 08:40:00.250 -> target 08:45:10.000 = 5m 09.750s
  const morning = new Date(2026, 10, 11, 8, 40, 0, 250);
  const sameDay = resolveNextTargetTimestampMs(morning, { hh: 8, mm: 45, ss: 10 });
  assert.equal(sameDay.isTomorrow, false);
  const sameDayMs = computeMsUntilTargetTime(morning, { hh: 8, mm: 45, ss: 10 });
  assert.equal(sameDayMs, (5 * 60 + 9) * 1000 + 750);
  assert.equal(
    formatDurationMs(sameDayMs, { hh: true, mm: true, ss: true, ms: true }),
    '00:05:09:750'
  );

  // Target earlier than current time rolls over to tomorrow (+23h)
  const evening = new Date(2026, 10, 11, 18, 0, 0, 0);
  const nextDay = resolveNextTargetTimestampMs(evening, { hh: 17, mm: 0, ss: 0 });
  assert.equal(nextDay.isTomorrow, true);
  assert.equal(
    computeMsUntilTargetTime(evening, { hh: 17, mm: 0, ss: 0 }),
    23 * 3600 * 1000
  );

  // Exact current timestamp rolls over to +24h future occurrence
  const exactMatch = resolveNextTargetTimestampMs(evening, { hh: 18, mm: 0, ss: 0 });
  assert.equal(exactMatch.isTomorrow, true);
  assert.equal(
    computeMsUntilTargetTime(evening, { hh: 18, mm: 0, ss: 0 }),
    24 * 3600 * 1000
  );
});

test('Jujitsu mode defaults to 15m total training time and loops Countdown/Cooldown until total time fills', () => {
  assert.equal(ClockMode.Jujitsu, 'jujitsu');
  assert.equal(JUJITSU_SOUND_OPTIONS.length, 5);
  assert.deepEqual(DEFAULT_SETTINGS.jujitsuConfig, {
    countdown: { hh: 0, mm: 5, ss: 0 },
    cooldown: { hh: 0, mm: 1, ss: 0 },
    totalDuration: { hh: 0, mm: 15, ss: 0 },
    startSoundId: JujitsuSoundId.DojoBell,
    stopSoundId: JujitsuSoundId.MatHorn,
  });

  // Verify default 15m session: 5m countdown + 1m cooldown + 5m countdown + 1m cooldown + 3m final countdown = 15m
  const defaultInit = createInitialJujitsuState(DEFAULT_SETTINGS.jujitsuConfig);
  assert.equal(defaultInit.phase, JujitsuPhase.Countdown);
  assert.equal(defaultInit.round, 1);
  assert.equal(defaultInit.remainingMs, 5 * 60_000);
  assert.equal(defaultInit.totalRemainingMs, 15 * 60_000);

  // Step 12 minutes (2 full rounds of 5m+1m) -> enters Round 3 with 3m capped countdown
  const after12m = stepJujitsuState(
    defaultInit,
    DEFAULT_SETTINGS.jujitsuConfig,
    12 * 60_000
  );
  assert.equal(after12m.nextState.phase, JujitsuPhase.Countdown);
  assert.equal(after12m.nextState.round, 3);
  assert.equal(after12m.nextState.remainingMs, 3 * 60_000);
  assert.equal(after12m.nextState.totalRemainingMs, 3 * 60_000);

  // Step remaining 3 minutes -> completes total training session cleanly
  const after15m = stepJujitsuState(
    after12m.nextState,
    DEFAULT_SETTINGS.jujitsuConfig,
    3 * 60_000
  );
  assert.equal(after15m.nextState.phase, JujitsuPhase.Completed);
  assert.equal(after15m.nextState.remainingMs, 0);
  assert.equal(after15m.nextState.totalRemainingMs, 0);
  assert.deepEqual(after15m.events, [
    { type: 'countdown-ended' },
    { type: 'training-completed', endedFrom: 'countdown' },
  ]);
});

test('Jujitsu Cooldown emits exact last-5-seconds warning events (5, 4, 3, 2, 1) and cooldown-ended', () => {
  const config = sanitizeJujitsuConfig({
    countdown: { hh: 0, mm: 0, ss: 4 },
    cooldown: { hh: 0, mm: 0, ss: 7 },
    totalDuration: { hh: 0, mm: 0, ss: 14 },
    startSoundId: JujitsuSoundId.TatamiGong,
    stopSoundId: JujitsuSoundId.ArcadeFight,
  });

  let state = createInitialJujitsuState(config);

  // Finish 4s Countdown -> enters 7s Cooldown
  const r1End = stepJujitsuState(state, config, 4000);
  assert.deepEqual(r1End.events, [{ type: 'countdown-ended' }]);
  assert.equal(r1End.nextState.phase, JujitsuPhase.Cooldown);
  assert.equal(r1End.nextState.remainingMs, 7000);
  state = r1End.nextState;

  // Advance 1.5s into Cooldown (5500ms left) -> no last-5s cue yet
  const beforeLast5 = stepJujitsuState(state, config, 1500);
  assert.deepEqual(beforeLast5.events, []);
  state = beforeLast5.nextState;

  // Step 1 second at a time across 5500 -> 4500 -> 3500 -> 2500 -> 1500 -> 500ms
  const observedWarnings: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const tick = stepJujitsuState(state, config, 1000);
    assert.equal(tick.events.length, 1);
    assert.equal(tick.events[0].type, 'cooldown-warning-second');
    if (tick.events[0].type === 'cooldown-warning-second') {
      observedWarnings.push(tick.events[0].second);
    }
    state = tick.nextState;
  }
  assert.deepEqual(observedWarnings, [5, 4, 3, 2, 1]);

  // Finish final 500ms of Cooldown -> emits cooldown-ended + countdown-started (Round 2, 3s left in 14s total)
  const cooldownDone = stepJujitsuState(state, config, 500);
  assert.deepEqual(cooldownDone.events, [
    { type: 'cooldown-ended' },
    { type: 'countdown-started', round: 2 },
  ]);
  assert.equal(cooldownDone.nextState.phase, JujitsuPhase.Countdown);
  assert.equal(cooldownDone.nextState.round, 2);
  assert.equal(cooldownDone.nextState.remainingMs, 3000);
  assert.equal(cooldownDone.nextState.totalRemainingMs, 3000);
});

test('shouldShowJujitsuQuickStart shows in idle/other modes and hides during active Jujitsu, UI hide, settings, or ringing alarm', () => {
  // Visible on initial Stopwatch mode (even if Stopwatch is running)
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.Stopwatch,
      isRunning: false,
      isUiHidden: false,
      isSettingsOpen: false,
      isAlarmRinging: false,
    }),
    true
  );
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.Stopwatch,
      isRunning: true,
      isUiHidden: false,
      isSettingsOpen: false,
      isAlarmRinging: false,
    }),
    true
  );

  // Visible in Jujitsu mode when paused / ready / completed
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.Jujitsu,
      isRunning: false,
      isUiHidden: false,
      isSettingsOpen: false,
      isAlarmRinging: false,
    }),
    true
  );

  // Hidden while Jujitsu session is actively running
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.Jujitsu,
      isRunning: true,
      isUiHidden: false,
      isSettingsOpen: false,
      isAlarmRinging: false,
    }),
    false
  );

  // Hidden when UI is hidden, settings drawer is open, or alarm clock is ringing
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.Stopwatch,
      isRunning: false,
      isUiHidden: true,
      isSettingsOpen: false,
      isAlarmRinging: false,
    }),
    false
  );
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.LiveClock,
      isRunning: false,
      isUiHidden: false,
      isSettingsOpen: true,
      isAlarmRinging: false,
    }),
    false
  );
  assert.equal(
    shouldShowJujitsuQuickStart({
      mode: ClockMode.AlarmClock,
      isRunning: false,
      isUiHidden: false,
      isSettingsOpen: false,
      isAlarmRinging: true,
    }),
    false
  );
});







