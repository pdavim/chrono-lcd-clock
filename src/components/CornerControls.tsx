import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Zap,
} from 'lucide-react';
import {
  BatteryStatusSnapshot,
  NavigatorWithBattery,
  UNSUPPORTED_BATTERY_STATUS,
  shouldRenderBatteryIndicator,
  subscribeToBatteryStatus,
} from '../utils/battery';
import { ClockMode } from '../utils/time';

interface CornerControlsProps {
  mode: ClockMode;
  showBatteryLevel: boolean;
  isRunning: boolean;
  isAlarmArmed: boolean;
  isAlarmRinging: boolean;
  isAlarmSnoozed: boolean;
  isSettingsOpen: boolean;
  isUiHidden: boolean;
  isAutoDimmed: boolean;
  onToggleStartPause: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onReset: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleAlarmArmed: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancelSnooze: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleSettings: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const BATTERY_SEGMENT_X: readonly number[] = [3.6, 8.2, 12.8, 17.4];

export function CornerControls({
  mode,
  showBatteryLevel,
  isRunning,
  isAlarmArmed,
  isAlarmRinging,
  isAlarmSnoozed,
  isSettingsOpen,
  isUiHidden,
  isAutoDimmed,
  onToggleStartPause,
  onReset,
  onToggleAlarmArmed,
  onCancelSnooze,
  onToggleSettings,
}: CornerControlsProps) {
  const [battery, setBattery] = useState<BatteryStatusSnapshot>(
    UNSUPPORTED_BATTERY_STATUS
  );

  useEffect(() => {
    const nav =
      typeof navigator !== 'undefined'
        ? (navigator as unknown as NavigatorWithBattery)
        : undefined;
    return subscribeToBatteryStatus(nav, setBattery);
  }, []);

  const visibilityClass = isUiHidden
    ? 'opacity-0 pointer-events-none'
    : isAutoDimmed
      ? 'opacity-10 hover:opacity-85 focus-visible:opacity-100'
      : 'opacity-30 hover:opacity-85 focus-visible:opacity-100';

  const batteryVisibilityClass = isUiHidden
    ? 'opacity-0 pointer-events-none'
    : isAutoDimmed
      ? 'opacity-10'
      : 'opacity-40 hover:opacity-85';

  const baseCornerBtn =
    'fixed z-20 min-h-[48px] min-w-[48px] p-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-current/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

  const isTimerMode =
    mode === ClockMode.Stopwatch ||
    mode === ClockMode.Countdown ||
    mode === ClockMode.Interval ||
    mode === ClockMode.FocusSession;

  return (
    <>
      {/* Top-Left Real-Time Web Battery API Indicator */}
      {shouldRenderBatteryIndicator({
        batterySupported: battery.supported,
        showBatteryLevel,
      }) && (
        <div
          id="battery-indicator"
          data-testid="battery-indicator"
          role="status"
          aria-live="polite"
          aria-label={battery.ariaLabel}
          aria-hidden={isUiHidden}
          className={`fixed top-5 left-6 z-20 flex min-h-[48px] items-center gap-2 px-2 select-none pointer-events-none transition-opacity duration-150 ${batteryVisibilityClass}`}
        >
          <svg
            width="28"
            height="14"
            viewBox="0 0 28 14"
            aria-hidden="true"
            className={`shrink-0 ${battery.isLow ? 'animate-pulse' : ''}`}
          >
            <rect
              x="1"
              y="1.5"
              width="22"
              height="11"
              rx="1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="24.2"
              y="4.5"
              width="2.4"
              height="5"
              rx="0.7"
              fill="currentColor"
            />
            {BATTERY_SEGMENT_X.map((xPos, index) => {
              const isLit = index < battery.bars;
              return (
                <rect
                  key={xPos}
                  x={xPos}
                  y="3.8"
                  width="3.2"
                  height="6.4"
                  rx="0.4"
                  fill="currentColor"
                  fillOpacity={isLit ? 1 : 0.16}
                />
              );
            })}
          </svg>
          {battery.charging && (
            <Zap
              data-testid="battery-charging-icon"
              className="h-3.5 w-3.5 fill-current shrink-0 -ml-0.5"
              aria-hidden="true"
            />
          )}
          <span className="font-mono text-xs font-semibold tracking-wider tabular-nums leading-none">
            {battery.levelPercent}%
          </span>
        </div>
      )}

      {/* Top-Right Discreet Settings Button */}
      <button
        type="button"
        id="gear-btn"
        aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
        aria-expanded={isSettingsOpen}
        aria-controls="controls-panel"
        onClick={onToggleSettings}
        className={`${baseCornerBtn} top-5 right-6 ${
          isSettingsOpen
            ? 'opacity-90 bg-current/10'
            : visibilityClass
        }`}
      >
        <Settings className="h-7 w-7 stroke-[2]" aria-hidden="true" />
      </button>

      {/* Bottom-Left Discreet Start / Pause Icon Button (Timer Modes) */}
      {isTimerMode && (
        <button
          type="button"
          id="start-btn"
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          onClick={onToggleStartPause}
          className={`${baseCornerBtn} bottom-5 left-6 ${visibilityClass}`}
        >
          {isRunning ? (
            <Pause className="h-7 w-7 fill-current stroke-[1.5]" aria-hidden="true" />
          ) : (
            <Play className="h-7 w-7 fill-current stroke-[1.5] translate-x-0.5" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Bottom-Right Discreet Reset Icon Button (Timer Modes) */}
      {isTimerMode && (
        <button
          type="button"
          id="reset-btn"
          aria-label="Reset timer"
          onClick={onReset}
          className={`${baseCornerBtn} bottom-5 right-6 ${visibilityClass}`}
        >
          <RotateCcw className="h-7 w-7 stroke-[2.2]" aria-hidden="true" />
        </button>
      )}

      {/* Bottom-Left Discreet Arm / Disarm Bell Button (Alarm Clock Mode) */}
      {mode === ClockMode.AlarmClock && (
        <button
          type="button"
          id="start-btn"
          aria-label={
            isAlarmRinging
              ? 'Stop ringing alarm'
              : isAlarmArmed
                ? 'Disarm alarm'
                : 'Arm alarm'
          }
          aria-pressed={isAlarmArmed}
          onClick={onToggleAlarmArmed}
          className={`${baseCornerBtn} bottom-5 left-6 ${
            isAlarmArmed && !isUiHidden ? 'opacity-70 hover:opacity-100' : visibilityClass
          }`}
        >
          {isAlarmArmed ? (
            <Bell className="h-7 w-7 stroke-[2]" aria-hidden="true" />
          ) : (
            <BellOff className="h-7 w-7 stroke-[2]" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Bottom-Right Cancel Snooze Button (Alarm Clock Mode when Snoozed) */}
      {mode === ClockMode.AlarmClock && isAlarmSnoozed && !isAlarmRinging && (
        <button
          type="button"
          id="reset-btn"
          aria-label="Cancel snooze"
          onClick={onCancelSnooze}
          className={`${baseCornerBtn} bottom-5 right-6 ${visibilityClass}`}
        >
          <RotateCcw className="h-7 w-7 stroke-[2.2]" aria-hidden="true" />
        </button>
      )}
    </>
  );
}

