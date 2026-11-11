import React from 'react';
import {
  AlarmClockConfig,
  ClockMode,
  FocusPhase,
  FocusState,
  IntervalPhase,
  IntervalState,
  LiveClockTimezone,
  formatAlarmTimeLabel,
  formatDurationMs,
} from '../utils/time';

export interface BgFlashEvent {
  key: number;
  kind: 'phase' | 'complete';
}

interface ClockFaceProps {
  displayRef: React.RefObject<HTMLDivElement | null>;
  initialText: string;
  mode: ClockMode;
  liveClockTimezone: LiveClockTimezone;
  showDate: boolean;
  calendarDateText: string;
  showSessionElapsed: boolean;
  sessionElapsedText: string;
  isAutoDimmed: boolean;
  intervalState: IntervalState;
  focusState: FocusState;
  alarmClock: AlarmClockConfig;
  isAlarmBlinking: boolean;
  isAlarmClockRinging: boolean;
  snoozeRemainingMs: number | null;
  phaseFlashKey: number;
  bgFlashEvent: BgFlashEvent | null;
  onClockAreaClick: () => void;
  onStopRingingAlarm: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSnoozeRingingAlarm: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ClockFace({
  displayRef,
  initialText,
  mode,
  liveClockTimezone,
  showDate,
  calendarDateText,
  showSessionElapsed,
  sessionElapsedText,
  isAutoDimmed,
  intervalState,
  focusState,
  alarmClock,
  isAlarmBlinking,
  isAlarmClockRinging,
  snoozeRemainingMs,
  phaseFlashKey,
  bgFlashEvent,
  onClockAreaClick,
  onStopRingingAlarm,
  onSnoozeRingingAlarm,
}: ClockFaceProps) {
  const renderStatusLine = () => {
    if (isAlarmClockRinging) {
      return (
        <div
          data-testid="alarm-clock-status"
          aria-live="assertive"
          className="mb-6 flex items-center justify-center gap-3 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-95 tabular-nums select-none"
        >
          <span>Alarm Ringing</span>
          <span aria-hidden="true" className="opacity-45">
            ·
          </span>
          <span className="font-normal opacity-85">
            {formatAlarmTimeLabel(alarmClock)}
          </span>
        </div>
      );
    }

    if (mode === ClockMode.AlarmClock) {
      if (snoozeRemainingMs !== null && snoozeRemainingMs > 0) {
        const snoozeCountdown = formatDurationMs(snoozeRemainingMs, {
          hh: false,
          mm: true,
          ss: true,
          ms: false,
        });
        return (
          <div
            data-testid="alarm-clock-status"
            aria-live="polite"
            className="mb-6 flex items-center justify-center gap-3 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-90 tabular-nums select-none"
          >
            <span>Alarm Snoozed</span>
            <span aria-hidden="true" className="opacity-45">
              ·
            </span>
            <span className="font-normal opacity-80">{snoozeCountdown}</span>
          </div>
        );
      }

      return (
        <div
          data-testid="alarm-clock-status"
          aria-live="polite"
          className="mb-6 flex items-center justify-center gap-3 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-90 tabular-nums select-none"
        >
          <span>Alarm {formatAlarmTimeLabel(alarmClock)}</span>
          <span aria-hidden="true" className="opacity-45">
            ·
          </span>
          <span className="font-normal opacity-80">
            {alarmClock.enabled ? 'Armed' : 'Off'}
          </span>
        </div>
      );
    }

    if (mode === ClockMode.Interval) {
      const phaseLabel =
        intervalState.phase === IntervalPhase.Work
          ? 'Work'
          : intervalState.phase === IntervalPhase.Rest
            ? 'Rest'
            : 'Session Complete';

      return (
        <div
          data-testid="interval-status"
          aria-live="polite"
          className="mb-6 flex items-center justify-center gap-3.5 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-90 tabular-nums select-none"
        >
          <span>{phaseLabel}</span>
          <span aria-hidden="true" className="opacity-45">
            ·
          </span>
          <span className="opacity-80 font-normal">
            Cycle {intervalState.currentCycle} of {intervalState.totalCycles}
          </span>
        </div>
      );
    }

    if (mode === ClockMode.FocusSession) {
      const phaseLabel =
        focusState.phase === FocusPhase.Focus
          ? 'Focus'
          : focusState.phase === FocusPhase.Break
            ? 'Short Break'
            : 'Focus Complete';

      return (
        <div
          data-testid="focus-status"
          aria-live="polite"
          className="mb-6 flex flex-col items-center justify-center gap-3 select-none"
        >
          <div className="flex flex-wrap items-center justify-center gap-3 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-90 tabular-nums">
            <span>{phaseLabel}</span>
            <span aria-hidden="true" className="opacity-45">
              ·
            </span>
            <span className="font-normal opacity-80">
              Cycle {focusState.currentSession} of {focusState.totalSessions}
            </span>
            <span aria-hidden="true" className="opacity-45">
              ·
            </span>
            <span
              data-testid="focus-completed-count"
              className="font-normal opacity-80"
            >
              {focusState.completedSessions} of {focusState.totalSessions} Done
            </span>
          </div>

          <div
            data-testid="focus-progress-bar"
            aria-hidden="true"
            className="flex items-center justify-center gap-1.5"
          >
            {Array.from({ length: focusState.totalSessions }).map((_, idx) => {
              const isDone = idx < focusState.completedSessions;
              const isCurrentFocus =
                idx === focusState.currentSession - 1 &&
                focusState.phase === FocusPhase.Focus;
              const segOpacity = isDone
                ? 'opacity-95'
                : isCurrentFocus
                  ? 'opacity-45'
                  : 'opacity-15';

              return (
                <span
                  key={`seg-${idx}`}
                  className={`h-1.5 w-6 sm:w-8 rounded-xs bg-current transition-opacity duration-200 ${segOpacity}`}
                />
              );
            })}
          </div>
        </div>
      );
    }

    if (mode === ClockMode.Countdown && isAlarmBlinking) {
      return (
        <div
          data-testid="countdown-status"
          aria-live="assertive"
          className="mb-6 flex items-center justify-center gap-2 text-base sm:text-xl md:text-2xl font-semibold tracking-wider opacity-90 select-none"
        >
          <span>Time Up</span>
        </div>
      );
    }

    if (
      mode === ClockMode.LiveClock &&
      liveClockTimezone === LiveClockTimezone.UTC
    ) {
      return (
        <div
          data-testid="live-clock-timezone"
          aria-live="polite"
          className="mb-6 flex items-center justify-center gap-3 text-base sm:text-xl md:text-2xl font-semibold tracking-widest opacity-85 select-none"
        >
          <span>UTC</span>
        </div>
      );
    }

    return null;
  };

  const shouldBlinkDigits = isAlarmBlinking || isAlarmClockRinging;

  return (
    <main
      onClick={onClockAreaClick}
      className="relative flex h-dvh w-screen flex-col items-center justify-center overflow-hidden px-4 select-none touch-manipulation cursor-pointer"
    >
      {bgFlashEvent && bgFlashEvent.key > 0 && (
        <div
          key={`bg-flash-${bgFlashEvent.key}`}
          data-testid="bg-flash-layer"
          aria-hidden="true"
          className={`clock-bg-flash-layer pointer-events-none fixed inset-0 z-0 opacity-0 ${
            bgFlashEvent.kind === 'complete'
              ? 'animate-bg-flash-complete'
              : 'animate-bg-flash-phase'
          }`}
        />
      )}

      {phaseFlashKey > 0 && (
        <div
          key={`cue-${phaseFlashKey}`}
          aria-hidden="true"
          className="animate-screen-cue pointer-events-none fixed inset-3 z-10 rounded-3xl border-2 border-current opacity-0"
        />
      )}

      <div
        data-testid="clock-dim-container"
        data-dimmed={isAutoDimmed ? 'true' : 'false'}
        className={`relative z-10 flex flex-col items-center justify-center ${
          isAutoDimmed ? 'clock-auto-dimmed' : 'clock-dim-surface'
        }`}
      >
        {renderStatusLine()}

        <div
          key={phaseFlashKey}
          className={phaseFlashKey > 0 ? 'animate-phase-flash' : undefined}
        >
          <div
            id="display"
            ref={displayRef}
            data-testid="clock-display"
            role="timer"
            aria-label="Clock display"
            className={`clock-digits text-center select-none ${
              shouldBlinkDigits ? 'animate-alarm-blink' : ''
            }`}
          >
            {initialText}
          </div>
        </div>

        {(showDate || showSessionElapsed) && (
          <div className="mt-6 flex flex-col items-center justify-center gap-2.5 select-none">
            {showDate && (
              <div
                data-testid="calendar-date"
                aria-label="Current calendar date"
                className="flex items-baseline justify-center text-base sm:text-xl md:text-2xl opacity-80"
              >
                {calendarDateText.split('/').map((part, idx, arr) => (
                  <React.Fragment key={`date-part-${idx}`}>
                    <span className="session-subcounter-digits">{part}</span>
                    {idx < arr.length - 1 && (
                      <span className="mx-1 font-sans font-semibold opacity-70">
                        /
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {showSessionElapsed && (
              <div
                data-testid="session-subcounter"
                aria-label="Session elapsed time"
                className="flex items-center justify-center gap-3 text-sm sm:text-base md:text-lg opacity-75"
              >
                <span className="font-medium tracking-wide opacity-80">
                  Session
                </span>
                <span aria-hidden="true" className="opacity-45">
                  ·
                </span>
                <span
                  data-testid="session-subcounter-value"
                  className="session-subcounter-digits text-base sm:text-xl md:text-2xl"
                >
                  {sessionElapsedText}
                </span>
              </div>
            )}
          </div>
        )}

        {isAlarmClockRinging && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              id="stop-alarm-btn"
              type="button"
              onClick={onStopRingingAlarm}
              className="alarm-action-primary h-12 min-w-[132px] rounded-xl px-6 text-sm font-bold tracking-wide transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Stop Alarm
            </button>
            <button
              id="snooze-alarm-btn"
              type="button"
              onClick={onSnoozeRingingAlarm}
              className="alarm-action-secondary h-12 min-w-[132px] rounded-xl border-2 px-6 text-sm font-semibold tracking-wide transition-transform active:scale-95 hover:opacity-85 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Snooze 5m
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

