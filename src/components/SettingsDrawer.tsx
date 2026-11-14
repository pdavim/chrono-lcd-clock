import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  Bell,
  BellOff,
  Bookmark,
  Calendar,
  Clock,
  LocateFixed,
  Minus,
  Moon,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Smartphone,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
  Zap,
  ZapOff,
} from 'lucide-react';
import {
  AlarmWakeMode,
  MediaConfig,
  getActiveMediaLabel,
} from '../utils/media';
import {
  PresetCategory,
  PresetClockMode,
  SavedTimerPreset,
} from '../utils/presets';
import { SolarTimesResult } from '../utils/solar';
import {
  ALARM_SOUND_OPTIONS,
  AlarmSoundId,
  COLOR_PRESETS,
  ClockMode,
  ClockSettings,
  CountdownTarget,
  FONT_OPTIONS,
  FocusState,
  FontOptionId,
  JUJITSU_SOUND_OPTIONS,
  JujitsuSoundId,
  LiveClockTimezone,
  TimeFieldKey,
  TimeUntilTarget,
  computeMsUntilAlarm,
  computeMsUntilTargetTime,
  countActiveFields,
  formatDurationMs,
  formatRemainingTimeBrief,
  formatTimeUntilLabel,
  isTimerClockMode,
  resolveNextTargetTimestampMs,
} from '../utils/time';
import { AboutSettingsPanel } from './AboutSettingsPanel';
import { PWAInstallButton } from './PWAInstallButton';
import { PresetGalleryPanel } from './PresetGalleryPanel';
import { RadioConnectorTab } from './RadioConnectorTab';
import {
  SettingsSectionGallery,
  SettingsTabId,
  getSettingsTabTitle,
} from './SettingsSectionGallery';

export type { SettingsTabId } from './SettingsSectionGallery';

interface DurationInputGroupProps {
  label: string;
  prefixId: string;
  value: CountdownTarget;
  maxHours?: number;
  minSecondsWhenZero?: boolean;
  onChange: (next: CountdownTarget) => void;
}

function DurationInputGroup({
  label,
  prefixId,
  value,
  maxHours = 99,
  onChange,
}: DurationInputGroupProps) {
  const handlePartChange = (part: keyof CountdownTarget, rawValue: string) => {
    const parsed = rawValue === '' ? 0 : parseInt(rawValue, 10);
    const safe = Number.isNaN(parsed) ? 0 : parsed;
    onChange({
      ...value,
      [part]: safe,
    });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1 text-slate-200">
        <input
          id={`${prefixId}-hh`}
          aria-label={`${label} hours`}
          type="number"
          min={0}
          max={maxHours}
          value={value.hh}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => handlePartChange('hh', e.target.value)}
          className="clean-num-input h-11 w-12 rounded-xl border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white tabular-nums settings-focus-ring"
        />
        <span className="text-xs font-bold text-slate-500" aria-hidden="true">
          :
        </span>
        <input
          id={`${prefixId}-mm`}
          aria-label={`${label} minutes`}
          type="number"
          min={0}
          max={59}
          value={value.mm}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => handlePartChange('mm', e.target.value)}
          className="clean-num-input h-11 w-12 rounded-xl border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white tabular-nums settings-focus-ring"
        />
        <span className="text-xs font-bold text-slate-500" aria-hidden="true">
          :
        </span>
        <input
          id={`${prefixId}-ss`}
          aria-label={`${label} seconds`}
          type="number"
          min={0}
          max={59}
          value={value.ss}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => handlePartChange('ss', e.target.value)}
          className="clean-num-input h-11 w-12 rounded-xl border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white tabular-nums settings-focus-ring"
        />
      </div>
    </div>
  );
}

interface SettingsDrawerProps {
  isOpen: boolean;
  requestedTab?: { key: number; tab: SettingsTabId } | null;
  settings: ClockSettings;
  focusState: FocusState;
  presets: readonly SavedTimerPreset[];
  isFullscreen: boolean;
  isAlarmSnoozed: boolean;
  isMidnightScheduledActive: boolean;
  solarTimes: SolarTimesResult | null;
  solarGeoStatus: 'idle' | 'locating' | 'ready' | 'error';
  solarGeoError: string | null;
  onClose: () => void;
  onChangeMode: (mode: ClockMode) => void;
  onChangeLiveClockTimezone: (timezone: LiveClockTimezone) => void;
  onToggleField: (field: TimeFieldKey) => void;
  onToggleShowDate: () => void;
  onToggleSessionElapsed: () => void;
  onToggleShowRadioControl: () => void;
  onToggleShowJujitsuQuickStart: () => void;
  onToggleShowBatteryLevel: () => void;
  onToggleAutoDim: () => void;
  onToggleAutoFullscreenWebApp: () => void;
  onEnterFullscreenNow: () => void;
  onChangeCountdownTarget: (target: CountdownTarget) => void;
  onChangeTimeUntilTarget: (target: TimeUntilTarget) => void;
  onChangeIntervalWork: (work: CountdownTarget) => void;
  onChangeIntervalRest: (rest: CountdownTarget) => void;
  onChangeIntervalCycles: (cycles: number) => void;
  onChangeJujitsuCountdown: (countdown: CountdownTarget) => void;
  onChangeJujitsuCooldown: (cooldown: CountdownTarget) => void;
  onChangeJujitsuTotalDuration: (totalDuration: CountdownTarget) => void;
  onChangeJujitsuStartSound: (soundId: JujitsuSoundId) => void;
  onTestJujitsuStartSound: () => void;
  onChangeJujitsuStopSound: (soundId: JujitsuSoundId) => void;
  onTestJujitsuStopSound: () => void;
  onChangeFocusWork: (work: CountdownTarget) => void;
  onChangeFocusBreak: (breakDuration: CountdownTarget) => void;
  onChangeFocusSessions: (sessions: number) => void;
  onChangeAlarmTime: (time: CountdownTarget) => void;
  onToggleAlarmClockArmed: () => void;
  onUpdateMedia: (patch: Partial<MediaConfig>) => void;
  onPlayMediaNow: () => void;
  onPauseMediaNow: () => void;
  onSavePreset: (
    name: string,
    category: PresetCategory,
    targetMode?: PresetClockMode
  ) => { ok: true } | { ok: false; error: string };
  onSelectPreset: (preset: SavedTimerPreset) => void;
  onDeletePreset: (presetId: string) => void;
  onToggleAlarmSound: () => void;
  onChangeAlarmSoundId: (soundId: AlarmSoundId) => void;
  onTestAlarmSound: () => void;
  onToggleGradualAlarmVolume: () => void;
  onToggleTickSound: () => void;
  onTestTickSound: () => void;
  onToggleVisualFlash: () => void;
  onTestVisualFlash: () => void;
  onToggleVibration: () => void;
  onTestVibration: () => void;
  onToggleDoubleTapReset: () => void;
  onChangeFont: (fontId: FontOptionId) => void;
  onChangeSize: (sizeVw: number) => void;
  onChangeClockColor: (color: string) => void;
  onChangeBgColor: (color: string) => void;
  onApplyPreset: (clockColor: string, bgColor: string) => void;
  onToggleSolarSchedule: () => void;
  onRefreshSolarLocation: () => void;
}

const FIELD_ITEMS: readonly { key: TimeFieldKey; label: string }[] = [
  { key: 'hh', label: 'HH' },
  { key: 'mm', label: 'MM' },
  { key: 'ss', label: 'SS' },
  { key: 'ms', label: 'MS' },
];

export function SettingsDrawer({
  isOpen,
  requestedTab,
  settings,
  focusState,
  presets,
  isFullscreen,
  isAlarmSnoozed,
  isMidnightScheduledActive,
  solarTimes,
  solarGeoStatus,
  solarGeoError,
  onClose,
  onChangeMode,
  onChangeLiveClockTimezone,
  onToggleField,
  onToggleShowDate,
  onToggleSessionElapsed,
  onToggleShowRadioControl,
  onToggleShowJujitsuQuickStart,
  onToggleShowBatteryLevel,
  onToggleAutoDim,
  onToggleAutoFullscreenWebApp,
  onEnterFullscreenNow,
  onChangeCountdownTarget,
  onChangeTimeUntilTarget,
  onChangeIntervalWork,
  onChangeIntervalRest,
  onChangeIntervalCycles,
  onChangeJujitsuCountdown,
  onChangeJujitsuCooldown,
  onChangeJujitsuTotalDuration,
  onChangeJujitsuStartSound,
  onTestJujitsuStartSound,
  onChangeJujitsuStopSound,
  onTestJujitsuStopSound,
  onChangeFocusWork,
  onChangeFocusBreak,
  onChangeFocusSessions,
  onChangeAlarmTime,
  onToggleAlarmClockArmed,
  onUpdateMedia,
  onPlayMediaNow,
  onPauseMediaNow,
  onSavePreset,
  onSelectPreset,
  onDeletePreset,
  onToggleAlarmSound,
  onChangeAlarmSoundId,
  onTestAlarmSound,
  onToggleGradualAlarmVolume,
  onToggleTickSound,
  onTestTickSound,
  onToggleVisualFlash,
  onTestVisualFlash,
  onToggleVibration,
  onTestVibration,
  onToggleDoubleTapReset,
  onChangeFont,
  onChangeSize,
  onChangeClockColor,
  onChangeBgColor,
  onApplyPreset,
  onToggleSolarSchedule,
  onRefreshSolarLocation,
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('timer');
  const [livePreviewNowMs, setLivePreviewNowMs] = useState<number>(() =>
    Date.now()
  );
  const sectionPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (
      !isOpen ||
      activeTab !== 'timer' ||
      (settings.mode !== ClockMode.TimeUntil &&
        settings.mode !== ClockMode.AlarmClock)
    ) {
      return undefined;
    }
    setLivePreviewNowMs(Date.now());
    const id = window.setInterval(() => {
      setLivePreviewNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isOpen, activeTab, settings.mode]);

  if (!isOpen) return null;

  const previewNowDate = new Date(livePreviewNowMs);
  const activeFieldCount = countActiveFields(settings.visibleFields);

  const nextAlarmBrief = formatRemainingTimeBrief(
    computeMsUntilAlarm(previewNowDate, settings.alarmClock)
  );
  const timeUntilResolution = resolveNextTargetTimestampMs(
    previewNowDate,
    settings.timeUntilTarget
  );
  const timeUntilRemainingPreviewMs = computeMsUntilTargetTime(
    previewNowDate,
    settings.timeUntilTarget
  );

  const handleSelectSectionTab = (tab: SettingsTabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.requestAnimationFrame(() => {
        sectionPanelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } else {
      sectionPanelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <div
      data-testid="settings-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/65 backdrop-blur-xs md:items-center md:p-6"
    >
      <section
        id="controls-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="settings-modal-shell flex h-[90dvh] max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border text-slate-100 shadow-2xl md:h-[84dvh] md:max-h-[760px] md:max-w-3xl lg:max-w-4xl md:rounded-3xl"
      >
        {/* Mobile Bottom-Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-700 md:hidden"
        />

        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 px-4 pt-2.5 pb-2.5 sm:px-6 md:pt-3.5 md:pb-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h2
              id="settings-modal-title"
              className="text-base font-semibold tracking-tight text-white whitespace-nowrap"
            >
              Settings
            </h2>
            <span
              aria-hidden="true"
              className="text-xs text-slate-500 whitespace-nowrap"
            >
              ·
            </span>
            <span className="truncate text-xs font-medium settings-accent-text whitespace-nowrap">
              {getSettingsTabTitle(activeTab)}
            </span>
          </div>
          <button
            id="close-settings-btn"
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer settings-focus-outline"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile Single-Scroll Sheet / Tablet 2-Pane Split Layout */}
        <div
          data-testid="settings-body-scroll"
          className="flex flex-1 min-h-0 flex-col overflow-y-auto settings-scroll md:flex-row md:overflow-hidden"
        >
          {/* Left / Top Pane: 2-Per-Row Category Thumbnail Gallery */}
          <div
            data-testid="settings-gallery-pane"
            className="shrink-0 border-b border-white/8 px-4 py-3.5 sm:px-5 md:w-[292px] lg:w-[320px] md:border-b-0 md:border-r md:overflow-y-auto md:py-4 settings-scroll"
          >
            <SettingsSectionGallery
              activeTab={activeTab}
              settings={settings}
              presetsCount={presets.length}
              onSelectTab={handleSelectSectionTab}
            />
          </div>

          {/* Right / Bottom Pane: Active Section Controls */}
          <div
            id="settings-active-section"
            ref={sectionPanelRef}
            data-testid="settings-section-pane"
            className="flex-1 min-w-0 px-4 py-4 pb-safe-sheet sm:px-6 md:overflow-y-auto md:py-5 settings-scroll"
          >
            {/* SECTION 1: TIMER MODE & PARAMETERS */}
            {activeTab === 'timer' && (
              <div
                id="panel-timer"
                role="tabpanel"
                aria-labelledby="tab-timer"
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-100">
                      Timer Mode
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Choose active clock or training mode
                    </span>
                  </div>
                  <select
                    id="mode-select"
                    aria-label="Mode"
                    value={settings.mode}
                    onChange={(e) => onChangeMode(e.target.value as ClockMode)}
                    className="h-11 w-48 sm:w-56 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-white settings-focus-ring"
                  >
                    <option value={ClockMode.Stopwatch}>Stopwatch</option>
                    <option value={ClockMode.Countdown}>Countdown</option>
                    <option value={ClockMode.TimeUntil}>Time Until</option>
                    <option value={ClockMode.Interval}>Interval Training</option>
                    <option value={ClockMode.Jujitsu}>Jujitsu</option>
                    <option value={ClockMode.FocusSession}>Focus Session</option>
                    <option value={ClockMode.AlarmClock}>Alarm Clock</option>
                    <option value={ClockMode.LiveClock}>Live Clock</option>
                  </select>
                </div>

                {/* Stopwatch Info */}
                {settings.mode === ClockMode.Stopwatch && (
                  <div className="border-t border-white/8 pt-3.5">
                    <p className="text-xs leading-relaxed text-slate-400">
                      Counts upward from zero. Tap the clock face, bottom-left
                      icon, or Spacebar to start and stop; double-tap the clock
                      face to reset.
                    </p>
                  </div>
                )}

                {/* Countdown Setup */}
                {settings.mode === ClockMode.Countdown && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <DurationInputGroup
                      label="Set Time"
                      prefixId="cd"
                      value={settings.countdownTarget}
                      onChange={onChangeCountdownTarget}
                    />
                  </div>
                )}

                {/* Time Until (Future Target HH:MM:SS) Setup */}
                {settings.mode === ClockMode.TimeUntil && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <DurationInputGroup
                      label="Target Time"
                      prefixId="tu"
                      maxHours={23}
                      value={settings.timeUntilTarget}
                      onChange={onChangeTimeUntilTarget}
                    />
                    <div
                      data-testid="time-until-preview"
                      className="flex items-center justify-between gap-3 border-t border-white/8 pt-3"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-200 tabular-nums">
                          {timeUntilResolution.isTomorrow ? 'Tomorrow' : 'Today'}{' '}
                          at {formatTimeUntilLabel(settings.timeUntilTarget)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Counts down live until target time
                        </span>
                      </div>
                      <span
                        data-testid="time-until-preview-countdown"
                        className="font-mono text-xs font-semibold settings-accent-text tabular-nums shrink-0"
                      >
                        {formatDurationMs(timeUntilRemainingPreviewMs, {
                          hh: true,
                          mm: true,
                          ss: true,
                          ms: false,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Interval Training Setup */}
                {settings.mode === ClockMode.Interval && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <DurationInputGroup
                      label="Work Duration"
                      prefixId="iv-work"
                      value={settings.intervalConfig.work}
                      onChange={onChangeIntervalWork}
                    />
                    <DurationInputGroup
                      label="Rest Duration"
                      prefixId="iv-rest"
                      value={settings.intervalConfig.rest}
                      onChange={onChangeIntervalRest}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="iv-cycles"
                        className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                      >
                        Cycles
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Decrease cycles"
                          onClick={() =>
                            onChangeIntervalCycles(
                              Math.max(1, settings.intervalConfig.cycles - 1)
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer settings-focus-outline"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <input
                          id="iv-cycles"
                          type="number"
                          min={1}
                          max={99}
                          value={settings.intervalConfig.cycles}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            onChangeIntervalCycles(
                              Number.isNaN(parsed) ? 1 : parsed
                            );
                          }}
                          className="clean-num-input h-11 w-14 rounded-xl border border-slate-700 bg-slate-800/90 px-2 text-center text-xs font-semibold text-white tabular-nums settings-focus-ring"
                        />
                        <button
                          type="button"
                          aria-label="Increase cycles"
                          onClick={() =>
                            onChangeIntervalCycles(
                              Math.min(99, settings.intervalConfig.cycles + 1)
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer settings-focus-outline"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Jujitsu (Combat / Kumite Training) Setup */}
                {settings.mode === ClockMode.Jujitsu && (
                  <div
                    data-testid="jujitsu-settings-group"
                    className="flex flex-col gap-3 border-t border-white/8 pt-3.5"
                  >
                    <DurationInputGroup
                      label="Countdown (Combat)"
                      prefixId="jj-countdown"
                      value={settings.jujitsuConfig.countdown}
                      onChange={onChangeJujitsuCountdown}
                    />
                    <DurationInputGroup
                      label="Cooldown (Rest)"
                      prefixId="jj-cooldown"
                      value={settings.jujitsuConfig.cooldown}
                      onChange={onChangeJujitsuCooldown}
                    />
                    <DurationInputGroup
                      label="Training Time"
                      prefixId="jj-total"
                      value={settings.jujitsuConfig.totalDuration}
                      onChange={onChangeJujitsuTotalDuration}
                    />

                    {/* Start Sound (Round Start & Cooldown Finish Longer Sound) */}
                    <div className="flex flex-col gap-1.5 border-t border-white/8 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="flex flex-col min-w-0">
                        <label
                          htmlFor="jj-start-sound-select"
                          className="text-xs font-medium text-slate-300 whitespace-nowrap"
                        >
                          Start Sound
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Round start &amp; cooldown end (long)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:shrink-0">
                        <select
                          id="jj-start-sound-select"
                          aria-label="Start sound"
                          value={settings.jujitsuConfig.startSoundId}
                          onChange={(e) =>
                            onChangeJujitsuStartSound(
                              e.target.value as JujitsuSoundId
                            )
                          }
                          className="h-11 min-w-0 flex-1 sm:w-44 sm:flex-none rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white settings-focus-ring"
                        >
                          {JUJITSU_SOUND_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          id="jj-test-start-sound-btn"
                          aria-label="Test start sound"
                          onClick={onTestJujitsuStartSound}
                          className="h-11 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                        >
                          Test
                        </button>
                      </div>
                    </div>

                    {/* Stop Sound (Countdown End Double Sound) */}
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="flex flex-col min-w-0">
                        <label
                          htmlFor="jj-stop-sound-select"
                          className="text-xs font-medium text-slate-300 whitespace-nowrap"
                        >
                          Stop Sound
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Countdown end (double sound)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:shrink-0">
                        <select
                          id="jj-stop-sound-select"
                          aria-label="Stop sound"
                          value={settings.jujitsuConfig.stopSoundId}
                          onChange={(e) =>
                            onChangeJujitsuStopSound(
                              e.target.value as JujitsuSoundId
                            )
                          }
                          className="h-11 min-w-0 flex-1 sm:w-44 sm:flex-none rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white settings-focus-ring"
                        >
                          {JUJITSU_SOUND_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          id="jj-test-stop-sound-btn"
                          aria-label="Test stop sound"
                          onClick={onTestJujitsuStopSound}
                          className="h-11 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white active:scale-95 transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                        >
                          Test
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Loops combat countdown and cooldown rest until total
                      training time finishes. Final 5s of cooldown flash &amp;
                      beep each second.
                    </p>
                  </div>
                )}

                {/* Focus Session (Pomodoro) Setup */}
                {settings.mode === ClockMode.FocusSession && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <DurationInputGroup
                      label="Focus Duration"
                      prefixId="focus-work"
                      value={settings.focusConfig.work}
                      onChange={onChangeFocusWork}
                    />
                    <DurationInputGroup
                      label="Break Duration"
                      prefixId="focus-break"
                      value={settings.focusConfig.breakDuration}
                      onChange={onChangeFocusBreak}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <label
                          htmlFor="focus-sessions"
                          className="text-xs font-medium text-slate-300 whitespace-nowrap"
                        >
                          Pomodoro Cycles
                        </label>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {focusState.completedSessions} of{' '}
                          {focusState.totalSessions} completed
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Decrease pomodoro cycles"
                          onClick={() =>
                            onChangeFocusSessions(
                              Math.max(1, settings.focusConfig.sessions - 1)
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer settings-focus-outline"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <input
                          id="focus-sessions"
                          type="number"
                          min={1}
                          max={24}
                          value={settings.focusConfig.sessions}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            onChangeFocusSessions(
                              Number.isNaN(parsed) ? 1 : parsed
                            );
                          }}
                          className="clean-num-input h-11 w-14 rounded-xl border border-slate-700 bg-slate-800/90 px-2 text-center text-xs font-semibold text-white tabular-nums settings-focus-ring"
                        />
                        <button
                          type="button"
                          aria-label="Increase pomodoro cycles"
                          onClick={() =>
                            onChangeFocusSessions(
                              Math.min(24, settings.focusConfig.sessions + 1)
                            )
                          }
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer settings-focus-outline"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alarm Clock Setup */}
                {settings.mode === ClockMode.AlarmClock && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <DurationInputGroup
                      label="Alarm Time"
                      prefixId="alarm"
                      maxHours={23}
                      value={{
                        hh: settings.alarmClock.hh,
                        mm: settings.alarmClock.mm,
                        ss: settings.alarmClock.ss,
                      }}
                      onChange={onChangeAlarmTime}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                          Daily Alarm
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {isAlarmSnoozed
                            ? 'Snoozed for 5m'
                            : settings.alarmClock.enabled
                              ? `Rings in ${nextAlarmBrief}`
                              : 'Currently disarmed'}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.alarmClock.enabled}
                        aria-label="Arm Alarm"
                        onClick={onToggleAlarmClockArmed}
                        className={`flex h-11 min-w-[96px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.alarmClock.enabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {settings.alarmClock.enabled ? (
                          <>
                            <Bell className="h-4 w-4" aria-hidden="true" />
                            <span>Armed</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="h-4 w-4" aria-hidden="true" />
                            <span>Off</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Wake-Up With Playlist / Radio Selector */}
                    <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-300">
                          Wake Up With
                        </span>
                        <span className="truncate text-[11px] text-slate-400">
                          {settings.media.alarmWakeMode === AlarmWakeMode.Media
                            ? getActiveMediaLabel(settings.media)
                            : 'Selected retro alarm tone'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-pressed={
                            settings.media.alarmWakeMode ===
                            AlarmWakeMode.RetroTone
                          }
                          onClick={() =>
                            onUpdateMedia({
                              alarmWakeMode: AlarmWakeMode.RetroTone,
                            })
                          }
                          className={`h-11 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer settings-focus-outline ${
                            settings.media.alarmWakeMode ===
                            AlarmWakeMode.RetroTone
                              ? 'settings-accent-solid'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          Tone
                        </button>
                        <button
                          type="button"
                          aria-pressed={
                            settings.media.alarmWakeMode === AlarmWakeMode.Media
                          }
                          onClick={() =>
                            onUpdateMedia({
                              alarmWakeMode: AlarmWakeMode.Media,
                            })
                          }
                          className={`h-11 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer settings-focus-outline ${
                            settings.media.alarmWakeMode === AlarmWakeMode.Media
                              ? 'settings-accent-solid'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                          }`}
                        >
                          Playlist / Radio
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Clock Time Zone Setup */}
                {settings.mode === ClockMode.LiveClock && (
                  <div className="flex flex-col gap-3 border-t border-white/8 pt-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                        Time Zone
                      </span>
                      <div
                        role="group"
                        aria-label="Live clock time zone"
                        className="grid w-48 sm:w-56 grid-cols-2 gap-1.5"
                      >
                        <button
                          type="button"
                          id="tz-local-btn"
                          aria-pressed={
                            settings.liveClockTimezone ===
                            LiveClockTimezone.Local
                          }
                          onClick={() =>
                            onChangeLiveClockTimezone(LiveClockTimezone.Local)
                          }
                          className={`h-11 rounded-xl border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                            settings.liveClockTimezone ===
                            LiveClockTimezone.Local
                              ? 'settings-accent-solid'
                              : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          Local
                        </button>
                        <button
                          type="button"
                          id="tz-utc-btn"
                          aria-pressed={
                            settings.liveClockTimezone === LiveClockTimezone.UTC
                          }
                          onClick={() =>
                            onChangeLiveClockTimezone(LiveClockTimezone.UTC)
                          }
                          className={`h-11 rounded-xl border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                            settings.liveClockTimezone === LiveClockTimezone.UTC
                              ? 'settings-accent-solid'
                              : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          UTC
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Shortcut to Presets + Clock Gesture Summary */}
                <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-slate-400">
                    {isTimerClockMode(settings.mode)
                      ? 'Tap clock face to start or pause · Double-tap to reset'
                      : 'Tap clock face to show or hide corner controls'}
                  </span>
                  <button
                    type="button"
                    id="open-presets-gallery-btn"
                    onClick={() => handleSelectSectionTab('presets')}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                  >
                    <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Open Presets ({presets.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 2: PRESETS MODE TABS & GALLERY */}
            {activeTab === 'presets' && (
              <PresetGalleryPanel
                settings={settings}
                presets={presets}
                onSavePreset={onSavePreset}
                onSelectPreset={onSelectPreset}
                onDeletePreset={onDeletePreset}
                onConfigureModeInTimerTab={(mode) => {
                  onChangeMode(mode);
                  handleSelectSectionTab('timer');
                }}
              />
            )}

            {/* SECTION 3: DISPLAY, CONTROLS & THEMES */}
            {activeTab === 'display' && (
              <div
                id="panel-display"
                role="tabpanel"
                aria-labelledby="tab-display"
                className="flex flex-col gap-5"
              >
                {/* Group 1: Digits, Typography & Scale */}
                <div className="flex flex-col gap-3.5">
                  <h3 className="text-xs font-semibold text-slate-100">
                    Digits &amp; Typography
                  </h3>

                  {/* Show Fields (HH, MM, SS, MS) */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                        Show Fields
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Milliseconds (MS) off by default
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      role="group"
                      aria-label="Visible clock fields"
                    >
                      {FIELD_ITEMS.map(({ key, label }) => {
                        const isActive = settings.visibleFields[key];
                        const isLastActive = isActive && activeFieldCount <= 1;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isActive}
                            disabled={isLastActive}
                            title={
                              isLastActive
                                ? 'At least one field must remain visible'
                                : `Toggle ${label}`
                            }
                            onClick={() => onToggleField(key)}
                            className={`h-11 min-w-[44px] rounded-xl border px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 settings-focus-outline ${
                              isActive
                                ? 'settings-accent-solid'
                                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                            } ${isLastActive ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="font-select"
                      className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                    >
                      Font
                    </label>
                    <select
                      id="font-select"
                      value={settings.fontId}
                      onChange={(e) =>
                        onChangeFont(e.target.value as FontOptionId)
                      }
                      className="h-11 w-48 sm:w-60 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white settings-focus-ring"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="size-slider"
                      className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                    >
                      Clock Size
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        id="size-slider"
                        type="range"
                        min={4}
                        max={24}
                        step={0.5}
                        value={settings.clockSizeVw}
                        onChange={(e) =>
                          onChangeSize(parseFloat(e.target.value))
                        }
                        className="h-8 w-36 sm:w-48 settings-range cursor-pointer"
                      />
                      <span className="w-9 text-right text-xs font-medium text-slate-400 tabular-nums">
                        {settings.clockSizeVw.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group 2: Main Screen Controls & Overlays */}
                <div className="flex flex-col gap-3.5 border-t border-white/8 pt-4">
                  <h3 className="text-xs font-semibold text-slate-100">
                    Main Screen Controls &amp; Overlays
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                    {/* Quick Start Jujitsu Button Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Quick Start Jujitsu
                        </span>
                        <span className="text-[11px] text-slate-400">
                          One-tap Jujitsu button on main screen
                        </span>
                      </div>
                      <button
                        id="show-jujitsu-quickstart-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.showJujitsuQuickStart}
                        aria-label="Quick Start Jujitsu"
                        onClick={onToggleShowJujitsuQuickStart}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.showJujitsuQuickStart
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {settings.showJujitsuQuickStart ? 'Show' : 'Hide'}
                        </span>
                      </button>
                    </div>

                    {/* Radio / Music Control Bar Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Radio / Music Control
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Player bar on main clock screen
                        </span>
                      </div>
                      <button
                        id="show-radio-control-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.showRadioControl}
                        aria-label="Radio / Music Control"
                        onClick={onToggleShowRadioControl}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.showRadioControl
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Radio className="h-4 w-4" aria-hidden="true" />
                        <span>{settings.showRadioControl ? 'On' : 'Off'}</span>
                      </button>
                    </div>

                    {/* Show Date (DD/MM/YYYY) Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Show Date
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Calendar date (DD/MM/YYYY)
                        </span>
                      </div>
                      <button
                        id="show-date-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.showDate}
                        aria-label="Show Date"
                        onClick={onToggleShowDate}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.showDate
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        <span>{settings.showDate ? 'On' : 'Off'}</span>
                      </button>
                    </div>

                    {/* Session Elapsed Sub-Counter Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Session Sub-Counter
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Total session time (HH:MM:SS)
                        </span>
                      </div>
                      <button
                        id="session-subcounter-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.showSessionElapsed}
                        aria-label="Session Sub-Counter"
                        onClick={onToggleSessionElapsed}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.showSessionElapsed
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {settings.showSessionElapsed ? 'On' : 'Off'}
                        </span>
                      </button>
                    </div>

                    {/* Battery Level Corner Indicator Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Battery Level
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Device charge in top-left corner
                        </span>
                      </div>
                      <button
                        id="show-battery-level-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.showBatteryLevel}
                        aria-label="Battery Level"
                        onClick={onToggleShowBatteryLevel}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.showBatteryLevel
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <BatteryCharging
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        <span>{settings.showBatteryLevel ? 'On' : 'Off'}</span>
                      </button>
                    </div>

                    {/* Auto-Dim Burn-In Protection Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Auto-Dim
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Dims display after 30s idle
                        </span>
                      </div>
                      <button
                        id="auto-dim-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.autoDimEnabled}
                        aria-label="Auto-Dim"
                        onClick={onToggleAutoDim}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.autoDimEnabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="h-4 w-4" aria-hidden="true" />
                        <span>{settings.autoDimEnabled ? 'On' : 'Off'}</span>
                      </button>
                    </div>

                    {/* Hide Top Status Bar in Standalone WebApp */}
                    <div className="flex items-center justify-between gap-3 sm:col-span-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-slate-200">
                          Hide Top Bar in WebApp
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Auto-enter native full screen on first tap when
                          installed on iPadOS or Android
                        </span>
                      </div>
                      <button
                        id="display-webapp-fullscreen-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.autoFullscreenWebApp}
                        aria-label="Hide Top Bar in WebApp"
                        onClick={onToggleAutoFullscreenWebApp}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.autoFullscreenWebApp
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Smartphone className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {settings.autoFullscreenWebApp ? 'On' : 'Off'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group 3: Color Themes, Custom Swatches & Solar Schedule */}
                <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-100">
                      {settings.solarSchedule.enabled
                        ? 'Preferred Daytime Theme'
                        : 'Color Themes'}
                    </h3>
                    {isMidnightScheduledActive && (
                      <span className="text-[11px] text-amber-300">
                        Midnight active until sunrise
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected =
                        settings.clockColor.toLowerCase() ===
                          preset.clockColor.toLowerCase() &&
                        settings.bgColor.toLowerCase() ===
                          preset.bgColor.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            onApplyPreset(preset.clockColor, preset.bgColor)
                          }
                          className={`flex h-11 items-center justify-center rounded-xl border px-3 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer settings-focus-outline ${
                            isSelected
                              ? 'settings-accent-card'
                              : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Clock & Background Pickers Side-by-Side */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                      <div className="flex flex-col min-w-0">
                        <label
                          htmlFor="color-picker"
                          className="text-xs font-medium text-slate-300 whitespace-nowrap"
                        >
                          Digits
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {settings.clockColor}
                        </span>
                      </div>
                      <input
                        id="color-picker"
                        aria-label="Clock Color"
                        type="color"
                        value={settings.clockColor}
                        onChange={(e) => onChangeClockColor(e.target.value)}
                        className="color-swatch-input h-11 w-11 shrink-0 p-1"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-2.5">
                      <div className="flex flex-col min-w-0">
                        <label
                          htmlFor="bg-picker"
                          className="text-xs font-medium text-slate-300 whitespace-nowrap"
                        >
                          Canvas
                        </label>
                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                          {settings.bgColor}
                        </span>
                      </div>
                      <input
                        id="bg-picker"
                        aria-label="Background"
                        type="color"
                        value={settings.bgColor}
                        onChange={(e) => onChangeBgColor(e.target.value)}
                        className="color-swatch-input h-11 w-11 shrink-0 p-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">
                        Sunset / Sunrise Schedule
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Midnight theme at sunset, preferred theme at sunrise
                      </span>
                    </div>
                    <button
                      id="solar-schedule-switch"
                      type="button"
                      role="switch"
                      aria-checked={settings.solarSchedule.enabled}
                      aria-label="Sunset / Sunrise Schedule"
                      onClick={onToggleSolarSchedule}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                        settings.solarSchedule.enabled
                          ? 'settings-accent-soft'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isMidnightScheduledActive ? (
                        <Moon className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Sun className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>
                        {settings.solarSchedule.enabled ? 'On' : 'Off'}
                      </span>
                    </button>
                  </div>

                  {(settings.solarSchedule.enabled || solarGeoError) && (
                    <div
                      data-testid="solar-schedule-card"
                      className="flex flex-col gap-2.5 border-t border-white/8 pt-3"
                    >
                      {solarGeoStatus === 'locating' && (
                        <p className="text-xs text-slate-300">
                          Requesting browser geolocation to calculate local
                          sunrise and sunset...
                        </p>
                      )}

                      {solarGeoError && (
                        <div className="flex items-center justify-between gap-2.5">
                          <p role="alert" className="text-xs text-amber-300">
                            {solarGeoError}
                          </p>
                          <button
                            id="refresh-solar-location-btn"
                            type="button"
                            onClick={onRefreshSolarLocation}
                            className="h-11 rounded-xl border border-slate-700 bg-slate-800 px-3.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {settings.solarSchedule.coords && solarTimes && (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              data-testid="solar-active-phase"
                              className="text-xs font-semibold text-slate-100"
                            >
                              {isMidnightScheduledActive
                                ? 'Night Active · Midnight Theme'
                                : 'Daytime Active · Preferred Theme'}
                            </span>
                            <button
                              id="refresh-solar-location-btn"
                              type="button"
                              aria-label="Update geolocation"
                              onClick={onRefreshSolarLocation}
                              className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-700/90 bg-slate-800/80 px-3 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                            >
                              <LocateFixed
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span>Update GPS</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 py-1">
                              <Sunrise
                                className="h-4 w-4 text-amber-300 shrink-0"
                                aria-hidden="true"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] text-slate-400">
                                  Sunrise
                                </span>
                                <span
                                  data-testid="solar-sunrise-time"
                                  className="font-mono text-xs font-semibold text-slate-100 tabular-nums"
                                >
                                  {solarTimes.sunriseLabel}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 py-1">
                              <Sunset
                                className="h-4 w-4 text-indigo-300 shrink-0"
                                aria-hidden="true"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] text-slate-400">
                                  Sunset
                                </span>
                                <span
                                  data-testid="solar-sunset-time"
                                  className="font-mono text-xs font-semibold text-slate-100 tabular-nums"
                                >
                                  {solarTimes.sunsetLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Group 4: Standalone Web App / iPad Home Screen Install */}
                <PWAInstallButton variant="settings" />
              </div>
            )}

            {/* SECTION 4: RADIO & MUSIC CONNECTORS */}
            {activeTab === 'radio' && (
              <RadioConnectorTab
                media={settings.media}
                onUpdateMedia={onUpdateMedia}
                onPlayMediaNow={onPlayMediaNow}
                onPauseMediaNow={onPauseMediaNow}
              />
            )}

            {/* SECTION 5: ALERTS, AUDIO & CLOCK GESTURES */}
            {activeTab === 'alerts' && (
              <div
                id="panel-alerts"
                role="tabpanel"
                aria-labelledby="tab-alerts"
                className="flex flex-col gap-5"
              >
                {/* Clock Face Gestures */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-slate-100">
                    Clock Face Gestures
                  </h3>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">
                        Double-Tap Reset
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Single-tap starts/stops any timer · Double-tap resets
                      </span>
                    </div>
                    <button
                      id="double-tap-reset-switch"
                      type="button"
                      role="switch"
                      aria-checked={settings.doubleTapResetEnabled}
                      aria-label="Double-Tap Reset"
                      onClick={onToggleDoubleTapReset}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                        settings.doubleTapResetEnabled
                          ? 'settings-accent-soft'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {settings.doubleTapResetEnabled ? 'On' : 'Off'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Audio Alerts */}
                <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
                  <h3 className="text-xs font-semibold text-slate-100">
                    Alarm &amp; Clock Audio
                  </h3>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                      Alarm Sound
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onTestAlarmSound}
                        aria-label="Preview alarm sound"
                        className="h-11 min-w-[56px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.alarmSoundEnabled}
                        aria-label="Alarm Sound"
                        onClick={onToggleAlarmSound}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.alarmSoundEnabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {settings.alarmSoundEnabled ? (
                          <>
                            <Volume2 className="h-4 w-4" aria-hidden="true" />
                            <span>On</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="h-4 w-4" aria-hidden="true" />
                            <span>Off</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="alarm-sound-select"
                      className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                    >
                      Alarm Tone
                    </label>
                    <select
                      id="alarm-sound-select"
                      value={settings.alarmSoundId}
                      onChange={(e) =>
                        onChangeAlarmSoundId(e.target.value as AlarmSoundId)
                      }
                      className="h-11 w-48 sm:w-60 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white settings-focus-ring"
                    >
                      {ALARM_SOUND_OPTIONS.map((tone) => (
                        <option key={tone.id} value={tone.id}>
                          {tone.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gradual Volume (30-Second Alarm Fade-In) */}
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">
                        Gradual Volume
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Fade in alarm audio over 30 seconds
                      </span>
                    </div>
                    <button
                      id="gradual-volume-switch"
                      type="button"
                      role="switch"
                      aria-checked={settings.gradualAlarmVolume}
                      aria-label="Gradual Volume"
                      onClick={onToggleGradualAlarmVolume}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                        settings.gradualAlarmVolume
                          ? 'settings-accent-soft'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                      <span>{settings.gradualAlarmVolume ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* Mechanical 80s Tick-Tock Sound (Live Clock) */}
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">
                        Tick-Tock Sound
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mechanical 80s tick synced to Live Clock seconds
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id="test-tick-sound-btn"
                        type="button"
                        onClick={onTestTickSound}
                        aria-label="Preview tick-tock sound"
                        className="h-11 min-w-[56px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                      >
                        Test
                      </button>
                      <button
                        id="tick-tock-switch"
                        type="button"
                        role="switch"
                        aria-checked={settings.tickSoundEnabled}
                        aria-label="Tick-Tock Sound"
                        onClick={onToggleTickSound}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.tickSoundEnabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        <span>{settings.tickSoundEnabled ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual & Haptic Notifications */}
                <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
                  <h3 className="text-xs font-semibold text-slate-100">
                    Visual &amp; Haptic Cues
                  </h3>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                      Screen Flash
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onTestVisualFlash}
                        aria-label="Preview screen flash"
                        className="h-11 min-w-[56px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.visualFlashEnabled}
                        aria-label="Screen Flash"
                        onClick={onToggleVisualFlash}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.visualFlashEnabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {settings.visualFlashEnabled ? (
                          <>
                            <Zap className="h-4 w-4" aria-hidden="true" />
                            <span>On</span>
                          </>
                        ) : (
                          <>
                            <ZapOff className="h-4 w-4" aria-hidden="true" />
                            <span>Off</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                      Vibration
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onTestVibration}
                        aria-label="Preview vibration"
                        className="h-11 min-w-[56px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.vibrationEnabled}
                        aria-label="Vibration"
                        onClick={onToggleVibration}
                        className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                          settings.vibrationEnabled
                            ? 'settings-accent-soft'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Smartphone className="h-4 w-4" aria-hidden="true" />
                        <span>{settings.vibrationEnabled ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: ABOUT, GESTURE GUIDE & WEBAPP FULLSCREEN */}
            {activeTab === 'about' && (
              <AboutSettingsPanel
                autoFullscreenWebApp={settings.autoFullscreenWebApp}
                isFullscreen={isFullscreen}
                onToggleAutoFullscreenWebApp={onToggleAutoFullscreenWebApp}
                onEnterFullscreenNow={onEnterFullscreenNow}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
