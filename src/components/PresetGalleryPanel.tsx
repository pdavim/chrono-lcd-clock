import React, { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import {
  PRESET_CATEGORY_OPTIONS,
  PresetCategory,
  PresetClockMode,
  SavedTimerPreset,
  filterPresetsByMode,
  formatPresetCardDisplay,
  getOrderedPresetModes,
  getPresetModeOption,
  isPresetMatchingSettings,
} from '../utils/presets';
import { ClockMode, ClockSettings } from '../utils/time';

interface PresetGalleryPanelProps {
  settings: ClockSettings;
  presets: readonly SavedTimerPreset[];
  onSavePreset: (
    name: string,
    category: PresetCategory,
    targetMode: PresetClockMode
  ) => { ok: true } | { ok: false; error: string };
  onSelectPreset: (preset: SavedTimerPreset) => void;
  onDeletePreset: (presetId: string) => void;
  onConfigureModeInTimerTab: (mode: PresetClockMode) => void;
}

function defaultCategoryForMode(mode: PresetClockMode): PresetCategory {
  if (
    mode === ClockMode.Jujitsu ||
    mode === ClockMode.Interval ||
    mode === ClockMode.AlarmClock
  ) {
    return PresetCategory.Exercise;
  }
  if (mode === ClockMode.Countdown) {
    return PresetCategory.Meditation;
  }
  return PresetCategory.Work;
}

export function PresetGalleryPanel({
  settings,
  presets,
  onSavePreset,
  onSelectPreset,
  onDeletePreset,
  onConfigureModeInTimerTab,
}: PresetGalleryPanelProps) {
  const orderedModes = getOrderedPresetModes(settings.mode);
  const firstOrderedMode = orderedModes[0];

  const [selectedMode, setSelectedMode] =
    useState<PresetClockMode>(firstOrderedMode);
  const [presetName, setPresetName] = useState<string>('');
  const [newPresetCategory, setNewPresetCategory] = useState<PresetCategory>(
    () => defaultCategoryForMode(firstOrderedMode)
  );
  const [presetError, setPresetError] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement | null>(null);

  // Keep active user timer mode selected as first tab whenever settings.mode changes
  useEffect(() => {
    const nextFirst = getOrderedPresetModes(settings.mode)[0];
    setSelectedMode(nextFirst);
    setNewPresetCategory(defaultCategoryForMode(nextFirst));
  }, [settings.mode]);

  const modePresets = filterPresetsByMode(presets, selectedMode);
  const selectedModeMeta = getPresetModeOption(selectedMode);

  const handleSelectModeTab = (mode: PresetClockMode) => {
    setSelectedMode(mode);
    setNewPresetCategory(defaultCategoryForMode(mode));
    setPresetError(null);
  };

  const handleSaveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = onSavePreset(presetName, newPresetCategory, selectedMode);
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
      id="panel-presets"
      role="tabpanel"
      aria-labelledby="tab-presets"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <h3 className="text-xs font-semibold text-slate-100">
            Timer Mode Presets
          </h3>
          <span className="text-[11px] text-slate-400">
            Active timer mode appears first · Tap any card to load
          </span>
        </div>
        <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap shrink-0">
          {presets.length} total
        </span>
      </div>

      {/* Mode Tabs (Active User Mode Always First) */}
      <div
        role="tablist"
        aria-label="Preset timer modes"
        data-testid="preset-mode-tabs"
        className="grid grid-cols-3 gap-1.5 sm:gap-2"
      >
        {orderedModes.map((mode, index) => {
          const opt = getPresetModeOption(mode);
          const count = filterPresetsByMode(presets, mode).length;
          const isSelected = selectedMode === mode;

          return (
            <button
              key={mode}
              id={`preset-mode-tab-${mode}`}
              data-testid={`preset-mode-tab-${index}`}
              data-mode={mode}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`preset-mode-panel-${mode}`}
              onClick={() => handleSelectModeTab(mode)}
              className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
                isSelected
                  ? 'settings-accent-solid shadow-xs'
                  : 'border-slate-800 bg-slate-900/85 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span className="truncate">{opt.shortLabel}</span>
              <span
                aria-hidden="true"
                className={`text-[11px] tabular-nums ${
                  isSelected ? 'opacity-80' : 'text-slate-500'
                }`}
              >
                · {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Presets Gallery Grid (2 Per Row on Mobile & Tablet) */}
      <div
        id={`preset-mode-panel-${selectedMode}`}
        role="tabpanel"
        aria-labelledby={`preset-mode-tab-${selectedMode}`}
        className="flex flex-col gap-3"
      >
        {modePresets.length === 0 ? (
          <div className="flex flex-col items-start justify-between gap-2.5 rounded-2xl border border-slate-800/90 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-200">
                No {selectedModeMeta.label} presets yet
              </span>
              <span className="text-[11px] text-slate-400">
                Save your current {selectedModeMeta.label} configuration below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onConfigureModeInTimerTab(selectedMode)}
              className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Edit {selectedModeMeta.shortLabel}
            </button>
          </div>
        ) : (
          <div
            data-testid="presets-gallery-grid"
            role="list"
            aria-label={`${selectedModeMeta.label} preset gallery`}
            className="grid grid-cols-2 gap-2.5 sm:gap-3"
          >
            {modePresets.map((preset) => {
              const isActivePreset = isPresetMatchingSettings(preset, settings);
              const cardInfo = formatPresetCardDisplay(preset);

              return (
                <div
                  key={preset.id}
                  role="listitem"
                  data-testid={`preset-gallery-item-${preset.id}`}
                  className={`group flex flex-col justify-between rounded-2xl border p-2.5 transition-colors ${
                    isActivePreset
                      ? 'settings-accent-card shadow-xs'
                      : 'border-slate-800/95 bg-slate-900/75 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isActivePreset}
                    onClick={() => {
                      setPresetError(null);
                      onSelectPreset(preset);
                    }}
                    className="flex w-full min-w-0 flex-col items-stretch gap-2 text-left cursor-pointer settings-focus-outline rounded-xl"
                  >
                    {/* Miniature LCD Gallery Thumbnail */}
                    <div
                      aria-hidden="true"
                      className={`flex h-12 sm:h-14 w-full flex-col items-center justify-center rounded-xl border px-2 transition-colors ${
                        isActivePreset
                          ? 'settings-accent-thumb'
                          : 'settings-idle-thumb'
                      }`}
                    >
                      <span className="preset-lcd-digits text-sm sm:text-base font-bold tracking-wider truncate max-w-full">
                        {cardInfo.primaryDigits}
                      </span>
                      <span className="mt-1 truncate max-w-full text-[10px] font-medium text-slate-400 tabular-nums">
                        {cardInfo.secondarySpec}
                      </span>
                    </div>

                    {/* Title & Clean Unboxed Metadata */}
                    <div className="flex min-w-0 flex-col px-0.5">
                      <span className="truncate text-xs font-semibold text-white">
                        {preset.name}
                      </span>
                      <span className="truncate text-[11px] text-slate-400 tabular-nums">
                        {cardInfo.categoryLabel}
                        {isActivePreset ? ' · Active' : ''}
                      </span>
                    </div>
                  </button>

                  {/* Touch-Friendly Footer Actions (>= 44px Hitboxes) */}
                  <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-white/8 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPresetError(null);
                        onSelectPreset(preset);
                      }}
                      className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer settings-focus-outline ${
                        isActivePreset
                          ? 'settings-accent-soft'
                          : 'bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Play
                        className="h-3.5 w-3.5 fill-current shrink-0"
                        aria-hidden="true"
                      />
                      <span>{isActivePreset ? 'Loaded' : 'Load'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete preset '${preset.name}'`}
                      onClick={() => onDeletePreset(preset.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/65 text-slate-400 hover:border-rose-500/50 hover:text-rose-300 transition-colors cursor-pointer settings-focus-outline"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Current Setup into Selected Mode Tab */}
      <div className="flex flex-col gap-2.5 border-t border-white/8 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Save {selectedModeMeta.label} Preset
          </span>
          <button
            type="button"
            onClick={() => onConfigureModeInTimerTab(selectedMode)}
            className="min-h-[36px] px-2 text-[11px] font-medium settings-accent-text hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Adjust {selectedModeMeta.shortLabel} values
          </button>
        </div>

        <form onSubmit={handleSaveSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              ref={presetInputRef}
              id="preset-name-input"
              type="text"
              aria-label="Preset name"
              placeholder={`New ${selectedModeMeta.shortLabel} preset name...`}
              maxLength={36}
              value={presetName}
              onChange={(e) => {
                setPresetName(e.target.value);
                if (presetError) setPresetError(null);
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 settings-focus-ring"
            />
            <div className="flex items-center gap-2 shrink-0">
              <select
                id="preset-category-select"
                aria-label="Preset category"
                value={newPresetCategory}
                onChange={(e) =>
                  setNewPresetCategory(e.target.value as PresetCategory)
                }
                className="h-11 flex-1 sm:w-36 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium text-white settings-focus-ring"
              >
                {PRESET_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-11 rounded-xl border px-4 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer settings-accent-solid settings-focus-outline"
              >
                Save
              </button>
            </div>
          </div>
          {presetError && (
            <p role="alert" className="text-xs text-rose-400">
              {presetError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
