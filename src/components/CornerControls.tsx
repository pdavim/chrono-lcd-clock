import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Settings,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import {
  BatteryStatusSnapshot,
  NavigatorWithBattery,
  UNSUPPORTED_BATTERY_STATUS,
  shouldRenderBatteryIndicator,
  subscribeToBatteryStatus,
} from '../utils/battery';
import { isStandaloneDisplayMode } from '../utils/fullscreen';
import { formatCompactDuration } from '../utils/presets';
import {
  ClockMode,
  JujitsuConfig,
  shouldShowJujitsuQuickStart,
} from '../utils/time';
import { PWAInstallButton } from './PWAInstallButton';

interface CornerControlsProps {
  mode: ClockMode;
  showBatteryLevel: boolean;
  showRadioControl: boolean;
  showJujitsuQuickStart: boolean;
  jujitsuConfig: JujitsuConfig;
  isRunning: boolean;
  isAlarmArmed: boolean;
  isAlarmRinging: boolean;
  isAlarmSnoozed: boolean;
  isSettingsOpen: boolean;
  isFullscreen: boolean;
  isUiHidden: boolean;
  isAutoDimmed: boolean;
  onToggleStartPause: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onReset: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onQuickStartJujitsu: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleAlarmArmed: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancelSnooze: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleFullscreen: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleSettings: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const BATTERY_SEGMENT_X: readonly number[] = [3.6, 8.2, 12.8, 17.4];

export function CornerControls({
  mode,
  showBatteryLevel,
  showRadioControl,
  showJujitsuQuickStart,
  jujitsuConfig,
  isRunning,
  isAlarmArmed,
  isAlarmRinging,
  isAlarmSnoozed,
  isSettingsOpen,
  isFullscreen,
  isUiHidden,
  isAutoDimmed,
  onToggleStartPause,
  onReset,
  onQuickStartJujitsu,
  onToggleAlarmArmed,
  onCancelSnooze,
  onToggleFullscreen,
  onToggleSettings,
}: CornerControlsProps) {
  const [isBrowserContext, setIsBrowserContext] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !isStandaloneDisplayMode(
      window,
      navigator as unknown as { standalone?: boolean }
    );
  });
  const [battery, setBattery] = useState<BatteryStatusSnapshot>(
    UNSUPPORTED_BATTERY_STATUS
  );
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncDisplayContext = () => {
      setIsBrowserContext(
        !isStandaloneDisplayMode(
          window,
          navigator as unknown as { standalone?: boolean }
        )
      );
    };
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', syncDisplayContext);
    return () => mql.removeEventListener?.('change', syncDisplayContext);
  }, []);

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

  const showQuickStart = shouldShowJujitsuQuickStart({
    showJujitsuQuickStart,
    mode,
    isRunning,
    isUiHidden,
    isSettingsOpen,
    isAlarmRinging,
  });

  const quickStartVisibilityClass = !showQuickStart
    ? 'opacity-0 pointer-events-none'
    : isAutoDimmed
      ? 'opacity-15 hover:opacity-95 focus-visible:opacity-100'
      : 'opacity-65 hover:opacity-100 focus-visible:opacity-100';

  const baseCornerBtn =
    'fixed z-20 min-h-[48px] min-w-[48px] p-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-current/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

  const isTimerMode =
    mode === ClockMode.Stopwatch ||
    mode === ClockMode.Countdown ||
    mode === ClockMode.TimeUntil ||
    mode === ClockMode.Interval ||
    mode === ClockMode.Jujitsu ||
    mode === ClockMode.FocusSession;

  const showBattery = shouldRenderBatteryIndicator({
    batterySupported: battery.supported,
    showBatteryLevel,
  });

  return (
    <>
      {/* Top-Left Real-Time Web Battery & Offline Status */}
      {(showBattery || !isOnline) && (
        <div
          aria-hidden={isUiHidden}
          className={`fixed safe-top-offset safe-left-offset z-20 flex min-h-[48px] items-center gap-3 px-2 select-none pointer-events-none transition-opacity duration-150 ${batteryVisibilityClass}`}
        >
          {showBattery && (
            <div
              id="battery-indicator"
              data-testid="battery-indicator"
              role="status"
              aria-live="polite"
              aria-label={battery.ariaLabel}
              className="flex items-center gap-2"
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

          {!isOnline && (
            <div
              id="offline-indicator"
              data-testid="offline-indicator"
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-xs font-medium tracking-wide whitespace-nowrap"
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Offline</span>
            </div>
          )}
        </div>
      )}

      {/* Top-Right Discreet Install, Full Screen & Settings Buttons */}
      <div className="fixed safe-top-offset safe-right-offset z-20 flex items-center gap-1.5">
        <PWAInstallButton variant="corner" visibilityClass={visibilityClass} />

        {isBrowserContext && (
          <button
            type="button"
            id="fullscreen-btn"
            aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
            onClick={onToggleFullscreen}
            className={`min-h-[48px] min-w-[48px] p-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-current/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              isFullscreen && !isUiHidden
                ? 'opacity-75 hover:opacity-100'
                : visibilityClass
            }`}
          >
            {isFullscreen ? (
              <Minimize className="h-7 w-7 stroke-[2]" aria-hidden="true" />
            ) : (
              <Maximize className="h-7 w-7 stroke-[2]" aria-hidden="true" />
            )}
          </button>
        )}

        <button
          type="button"
          id="gear-btn"
          aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
          aria-expanded={isSettingsOpen}
          aria-controls="controls-panel"
          onClick={onToggleSettings}
          className={`min-h-[48px] min-w-[48px] p-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-current/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
            isSettingsOpen ? 'opacity-90 bg-current/10' : visibilityClass
          }`}
        >
          <Settings className="h-7 w-7 stroke-[2]" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom-Left Discreet Start / Pause Icon Button (Timer Modes) */}
      {isTimerMode && (
        <button
          type="button"
          id="start-btn"
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          onClick={onToggleStartPause}
          className={`${baseCornerBtn} safe-bottom-offset safe-left-offset ${visibilityClass}`}
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
          className={`${baseCornerBtn} safe-bottom-offset safe-right-offset ${visibilityClass}`}
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
          className={`${baseCornerBtn} safe-bottom-offset safe-left-offset ${
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
          className={`${baseCornerBtn} safe-bottom-offset safe-right-offset ${visibilityClass}`}
        >
          <RotateCcw className="h-7 w-7 stroke-[2.2]" aria-hidden="true" />
        </button>
      )}

      {/* Bottom-Center One-Click Quick Start Jujitsu Button */}
      <button
        type="button"
        id="jujitsu-quick-start-btn"
        data-testid="jujitsu-quick-start-btn"
        aria-hidden={!showQuickStart}
        inert={!showQuickStart}
        title="Start a Jujitsu training round immediately with current settings"
        onClick={onQuickStartJujitsu}
        className={`fixed left-1/2 z-20 -translate-x-1/2 ${
          showRadioControl
            ? 'safe-quick-start-offset'
            : 'safe-quick-start-offset safe-quick-start-no-radio'
        } flex min-h-[44px] h-11 items-center gap-2 rounded-xl border border-current/25 bg-current/[0.08] px-4 text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 backdrop-blur-md cursor-pointer transition-all duration-150 hover:bg-current/15 hover:border-current/40 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${quickStartVisibilityClass}`}
      >
        <Play className="h-3.5 w-3.5 fill-current shrink-0" aria-hidden="true" />
        <span>Quick Start Jujitsu</span>
        <span aria-hidden="true" className="opacity-45">
          ·
        </span>
        <span className="font-mono opacity-80 tabular-nums">
          {formatCompactDuration(jujitsuConfig.countdown)}/
          {formatCompactDuration(jujitsuConfig.cooldown)}
        </span>
      </button>
    </>
  );
}
