import React, { useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  Bell,
  BellOff,
  Calendar,
  Clock,
  Minus,
  Moon,
  Plus,
  Radio,
  RotateCcw,
  Smartphone,
  Trash2,
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
  SavedTimerPreset,
  formatPresetSummary,
  isPresetMatchingSettings,
} from '../utils/presets';
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
  LiveClockTimezone,
  TimeFieldKey,
  computeMsUntilAlarm,
  countActiveFields,
  formatRemainingTimeBrief,
} from '../utils/time';
import { RadioConnectorTab } from './RadioConnectorTab';

export type SettingsTabId = 'timer' | 'radio' | 'display' | 'alerts';

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
          className="clean-num-input h-11 w-12 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white focus-visible:border-emerald-400 focus-visible:outline-none"
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
          className="clean-num-input h-11 w-12 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white focus-visible:border-emerald-400 focus-visible:outline-none"
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
          className="clean-num-input h-11 w-12 rounded-lg border border-slate-700 bg-slate-800/90 px-1.5 text-center text-xs font-semibold text-white focus-visible:border-emerald-400 focus-visible:outline-none"
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
  isAlarmSnoozed: boolean;
  onClose: () => void;
  onChangeMode: (mode: ClockMode) => void;
  onChangeLiveClockTimezone: (timezone: LiveClockTimezone) => void;
  onToggleField: (field: TimeFieldKey) => void;
  onToggleShowDate: () => void;
  onToggleSessionElapsed: () => void;
  onToggleShowRadioControl: () => void;
  onToggleShowBatteryLevel: () => void;
  onToggleAutoDim: () => void;
  onChangeCountdownTarget: (target: CountdownTarget) => void;
  onChangeIntervalWork: (work: CountdownTarget) => void;
  onChangeIntervalRest: (rest: CountdownTarget) => void;
  onChangeIntervalCycles: (cycles: number) => void;
  onChangeFocusWork: (work: CountdownTarget) => void;
  onChangeFocusBreak: (breakDuration: CountdownTarget) => void;
  onChangeFocusSessions: (sessions: number) => void;
  onChangeAlarmTime: (time: CountdownTarget) => void;
  onToggleAlarmClockArmed: () => void;
  onUpdateMedia: (patch: Partial<MediaConfig>) => void;
  onPlayMediaNow: () => void;
  onPauseMediaNow: () => void;
  onSavePreset: (name: string) => { ok: true } | { ok: false; error: string };
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
}

const FIELD_ITEMS: readonly { key: TimeFieldKey; label: string }[] = [
  { key: 'hh', label: 'HH' },
  { key: 'mm', label: 'MM' },
  { key: 'ss', label: 'SS' },
  { key: 'ms', label: 'MS' },
];

const SETTINGS_TABS: readonly { id: SettingsTabId; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'radio', label: 'Radio' },
  { id: 'display', label: 'Display' },
  { id: 'alerts', label: 'Alerts' },
];

export function SettingsDrawer({
  isOpen,
  requestedTab,
  settings,
  focusState,
  presets,
  isAlarmSnoozed,
  onClose,
  onChangeMode,
  onChangeLiveClockTimezone,
  onToggleField,
  onToggleShowDate,
  onToggleSessionElapsed,
  onToggleShowRadioControl,
  onToggleShowBatteryLevel,
  onToggleAutoDim,
  onChangeCountdownTarget,
  onChangeIntervalWork,
  onChangeIntervalRest,
  onChangeIntervalCycles,
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
}: SettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('timer');
  const [presetName, setPresetName] = useState<string>('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  if (!isOpen) return null;

  const activeFieldCount = countActiveFields(settings.visibleFields);
  const canSaveCurrentMode =
    settings.mode === ClockMode.Countdown ||
    settings.mode === ClockMode.Interval ||
    settings.mode === ClockMode.FocusSession ||
    settings.mode === ClockMode.AlarmClock;

  const nextAlarmBrief = formatRemainingTimeBrief(
    computeMsUntilAlarm(new Date(), settings.alarmClock)
  );

  const handleSavePresetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = onSavePreset(presetName);
    if (!res.ok) {
      setPresetError(res.error);
      presetInputRef.current?.focus();
      return;
    }
    setPresetName('');
    setPresetError(null);
  };

  return (
    <div
      data-testid="settings-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-6"
    >
      <section
        id="controls-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-slate-950/96 text-slate-100 shadow-2xl backdrop-blur-xl sm:max-h-[82dvh] sm:max-w-lg sm:rounded-3xl"
      >
        {/* Mobile Bottom-Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-700 sm:hidden"
        />

        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pt-2.5 pb-2.5 sm:pt-4">
          <h2
            id="settings-modal-title"
            className="text-base font-semibold tracking-tight text-white"
          >
            Settings
          </h2>
          <button
            id="close-settings-btn"
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Organized Section Tabs */}
        <div className="shrink-0 border-b border-white/8 px-5 pb-3.5">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="grid grid-cols-4 gap-1 rounded-xl bg-slate-900/90 p-1"
          >
            {SETTINGS_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-11 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-6">
          {/* TAB 1: TIMER & PRESETS */}
          {activeTab === 'timer' && (
            <div
              id="panel-timer"
              role="tabpanel"
              aria-labelledby="tab-timer"
              className="flex flex-col gap-4"
            >
              {/* Mode Selector */}
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="mode-select"
                  className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0"
                >
                  Mode
                </label>
                <select
                  id="mode-select"
                  value={settings.mode}
                  onChange={(e) => {
                    setPresetError(null);
                    onChangeMode(e.target.value as ClockMode);
                  }}
                  className="h-11 w-52 sm:w-60 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-white focus-visible:border-emerald-400 focus-visible:outline-none"
                >
                  <option value={ClockMode.Stopwatch}>Stopwatch</option>
                  <option value={ClockMode.Countdown}>Countdown</option>
                  <option value={ClockMode.Interval}>Interval Training</option>
                  <option value={ClockMode.FocusSession}>Focus Session</option>
                  <option value={ClockMode.AlarmClock}>Alarm Clock</option>
                  <option value={ClockMode.LiveClock}>Live Clock</option>
                </select>
              </div>

              {/* Stopwatch Info */}
              {settings.mode === ClockMode.Stopwatch && (
                <div className="border-t border-white/8 pt-3.5">
                  <p className="text-xs text-slate-400">
                    Counts upward from zero with millisecond precision. Use the
                    bottom-left icon or Spacebar to start and pause.
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
                    onChange={(target) => {
                      setPresetError(null);
                      onChangeCountdownTarget(target);
                    }}
                  />
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
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer"
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
                        className="clean-num-input h-11 w-14 rounded-lg border border-slate-700 bg-slate-800/90 px-2 text-center text-xs font-semibold text-white focus-visible:border-emerald-400 focus-visible:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase cycles"
                        onClick={() =>
                          onChangeIntervalCycles(
                            Math.min(99, settings.intervalConfig.cycles + 1)
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
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
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer"
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
                        className="clean-num-input h-11 w-14 rounded-lg border border-slate-700 bg-slate-800/90 px-2 text-center text-xs font-semibold text-white focus-visible:border-emerald-400 focus-visible:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase pomodoro cycles"
                        onClick={() =>
                          onChangeFocusSessions(
                            Math.min(24, settings.focusConfig.sessions + 1)
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:scale-95 transition-colors cursor-pointer"
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
                    onChange={(nextTime) => {
                      setPresetError(null);
                      onChangeAlarmTime(nextTime);
                    }}
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
                      className={`flex h-11 min-w-[96px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        settings.alarmClock.enabled
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
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
                          settings.media.alarmWakeMode === AlarmWakeMode.RetroTone
                        }
                        onClick={() =>
                          onUpdateMedia({
                            alarmWakeMode: AlarmWakeMode.RetroTone,
                          })
                        }
                        className={`h-10 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          settings.media.alarmWakeMode === AlarmWakeMode.RetroTone
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
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
                          onUpdateMedia({ alarmWakeMode: AlarmWakeMode.Media })
                        }
                        className={`h-10 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          settings.media.alarmWakeMode === AlarmWakeMode.Media
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
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
                      className="grid w-52 sm:w-60 grid-cols-2 gap-1.5"
                    >
                      <button
                        type="button"
                        id="tz-local-btn"
                        aria-pressed={
                          settings.liveClockTimezone === LiveClockTimezone.Local
                        }
                        onClick={() =>
                          onChangeLiveClockTimezone(LiveClockTimezone.Local)
                        }
                        className={`h-11 rounded-lg border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.liveClockTimezone === LiveClockTimezone.Local
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
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
                        className={`h-11 rounded-lg border px-3 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.liveClockTimezone === LiveClockTimezone.UTC
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        UTC
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Presets Section */}
              <div className="flex flex-col gap-2.5 border-t border-white/8 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200">
                    Presets
                  </h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {presets.length} saved
                  </span>
                </div>

                {presets.length === 0 ? (
                  <p className="py-1 text-xs text-slate-400">
                    No saved presets yet.
                  </p>
                ) : (
                  <div
                    className="flex flex-col gap-1.5"
                    role="list"
                    aria-label="Saved timer presets"
                  >
                    {presets.map((preset) => {
                      const isActivePreset = isPresetMatchingSettings(
                        preset,
                        settings
                      );
                      return (
                        <div
                          key={preset.id}
                          role="listitem"
                          className="flex items-center gap-1.5"
                        >
                          <button
                            type="button"
                            aria-pressed={isActivePreset}
                            onClick={() => {
                              setPresetError(null);
                              onSelectPreset(preset);
                            }}
                            className={`flex min-h-[44px] min-w-0 flex-1 flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-left transition-colors cursor-pointer ${
                              isActivePreset
                                ? 'border-emerald-400/80 bg-emerald-400/15 text-emerald-100'
                                : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-600 hover:bg-slate-900'
                            }`}
                          >
                            <span className="w-full truncate text-xs font-semibold">
                              {preset.name}
                            </span>
                            <span className="w-full truncate text-[11px] text-slate-400 tabular-nums">
                              {formatPresetSummary(preset)}
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete preset '${preset.name}'`}
                            onClick={() => onDeletePreset(preset.id)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-rose-500/50 hover:text-rose-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {canSaveCurrentMode ? (
                  <form
                    onSubmit={handleSavePresetSubmit}
                    className="flex flex-col gap-1.5 pt-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={presetInputRef}
                        id="preset-name-input"
                        type="text"
                        aria-label="Preset name"
                        placeholder="Save current as preset..."
                        maxLength={36}
                        value={presetName}
                        onChange={(e) => {
                          setPresetName(e.target.value);
                          if (presetError) setPresetError(null);
                        }}
                        className="h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus-visible:border-emerald-400 focus-visible:outline-none"
                      />
                      <button
                        type="submit"
                        className="h-11 rounded-lg bg-emerald-400 px-4 text-xs font-semibold text-slate-950 hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                    {presetError && (
                      <p role="alert" className="text-xs text-rose-400">
                        {presetError}
                      </p>
                    )}
                  </form>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Select Countdown, Interval, or Alarm Clock mode above to save
                    a preset.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RADIO & MUSIC CONNECTORS */}
          {activeTab === 'radio' && (
            <RadioConnectorTab
              media={settings.media}
              onUpdateMedia={onUpdateMedia}
              onPlayMediaNow={onPlayMediaNow}
              onPauseMediaNow={onPauseMediaNow}
            />
          )}

          {/* TAB 3: DISPLAY, SUB-COUNTER & THEMES */}
          {activeTab === 'display' && (
            <div
              id="panel-display"
              role="tabpanel"
              aria-labelledby="tab-display"
              className="flex flex-col gap-4"
            >
              {/* Show Fields (HH, MM, SS, MS) */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                  Show Fields
                </span>
                <div
                  className="flex items-center gap-1.5"
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
                        className={`h-11 min-w-[46px] rounded-lg border px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                        } ${isLastActive ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show Date (DD/MM/YYYY) Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Show Date
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Current calendar date (DD/MM/YYYY)
                  </span>
                </div>
                <button
                  id="show-date-switch"
                  type="button"
                  role="switch"
                  aria-checked={settings.showDate}
                  aria-label="Show Date"
                  onClick={onToggleShowDate}
                  className={`flex h-11 min-w-[86px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.showDate
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.showDate ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Session Elapsed Sub-Counter Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Session Sub-Counter
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Total elapsed session time (HH:MM:SS)
                  </span>
                </div>
                <button
                  id="session-subcounter-switch"
                  type="button"
                  role="switch"
                  aria-checked={settings.showSessionElapsed}
                  aria-label="Session Sub-Counter"
                  onClick={onToggleSessionElapsed}
                  className={`flex h-11 min-w-[86px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.showSessionElapsed
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.showSessionElapsed ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Radio / Music Control Bar Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Radio / Music Control
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Show player bar on main clock screen
                  </span>
                </div>
                <button
                  id="show-radio-control-switch"
                  type="button"
                  role="switch"
                  aria-checked={settings.showRadioControl}
                  aria-label="Radio / Music Control"
                  onClick={onToggleShowRadioControl}
                  className={`flex h-11 min-w-[86px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.showRadioControl
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.showRadioControl ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Battery Level Corner Indicator Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Battery Level
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Show real-time device charge in corner
                  </span>
                </div>
                <button
                  id="show-battery-level-switch"
                  type="button"
                  role="switch"
                  aria-checked={settings.showBatteryLevel}
                  aria-label="Battery Level"
                  onClick={onToggleShowBatteryLevel}
                  className={`flex h-11 min-w-[86px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.showBatteryLevel
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BatteryCharging className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.showBatteryLevel ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Auto-Dim Burn-In Protection Toggle */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Auto-Dim
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dims display after 30s of inactivity
                  </span>
                </div>
                <button
                  id="auto-dim-switch"
                  type="button"
                  role="switch"
                  aria-checked={settings.autoDimEnabled}
                  aria-label="Auto-Dim"
                  onClick={onToggleAutoDim}
                  className={`flex h-11 min-w-[86px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.autoDimEnabled
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.autoDimEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Typography & Scale */}
              <div className="flex flex-col gap-3.5 border-t border-white/8 pt-4">
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
                    className="h-11 w-52 sm:w-60 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white focus-visible:border-emerald-400 focus-visible:outline-none"
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
                      onChange={(e) => onChangeSize(parseFloat(e.target.value))}
                      className="h-8 w-40 sm:w-48 accent-emerald-400 cursor-pointer"
                    />
                    <span className="w-9 text-right text-xs font-medium text-slate-400 tabular-nums">
                      {settings.clockSizeVw.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Color Themes & Custom Pickers */}
              <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
                <h3 className="text-xs font-semibold text-slate-200">
                  Color Themes
                </h3>
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
                        className={`flex h-11 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Clock & Background Pickers Side-by-Side */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5">
                    <div className="flex flex-col min-w-0">
                      <label
                        htmlFor="color-picker"
                        className="text-xs font-medium text-slate-300 whitespace-nowrap"
                      >
                        Digits
                      </label>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
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

                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5">
                    <div className="flex flex-col min-w-0">
                      <label
                        htmlFor="bg-picker"
                        className="text-xs font-medium text-slate-300 whitespace-nowrap"
                      >
                        Canvas
                      </label>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
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
              </div>
            </div>
          )}

          {/* TAB 3: ALERTS & GESTURES */}
          {activeTab === 'alerts' && (
            <div
              id="panel-alerts"
              role="tabpanel"
              aria-labelledby="tab-alerts"
              className="flex flex-col gap-4"
            >
              {/* Audio Alerts */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                    Alarm Sound
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onTestAlarmSound}
                      aria-label="Preview alarm sound"
                      className="h-11 min-w-[56px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.alarmSoundEnabled}
                      aria-label="Alarm Sound"
                      onClick={onToggleAlarmSound}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        settings.alarmSoundEnabled
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
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
                    className="h-11 w-52 sm:w-60 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white focus-visible:border-emerald-400 focus-visible:outline-none"
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
                    className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.gradualAlarmVolume
                        ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
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
                      className="h-11 min-w-[56px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        settings.tickSoundEnabled
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap shrink-0">
                    Screen Flash
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onTestVisualFlash}
                      aria-label="Preview screen flash"
                      className="h-11 min-w-[56px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.visualFlashEnabled}
                      aria-label="Screen Flash"
                      onClick={onToggleVisualFlash}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        settings.visualFlashEnabled
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
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
                      className="h-11 min-w-[56px] rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.vibrationEnabled}
                      aria-label="Vibration"
                      onClick={onToggleVibration}
                      className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        settings.vibrationEnabled
                          ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                      <span>{settings.vibrationEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Touch Gestures */}
              <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-200">
                    Double-Tap Reset
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Double-tap clock face to reset active timer
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.doubleTapResetEnabled}
                  aria-label="Double-Tap Reset"
                  onClick={onToggleDoubleTapReset}
                  className={`flex h-11 min-w-[82px] items-center justify-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    settings.doubleTapResetEnabled
                      ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>{settings.doubleTapResetEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
