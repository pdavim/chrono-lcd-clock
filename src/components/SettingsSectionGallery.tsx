import React from 'react';
import { COLOR_PRESETS, ClockMode, ClockSettings } from '../utils/time';
import { MediaProvider } from '../utils/media';

export type SettingsTabId =
  | 'timer'
  | 'presets'
  | 'display'
  | 'radio'
  | 'alerts';

interface SettingsSectionGalleryProps {
  activeTab: SettingsTabId;
  settings: ClockSettings;
  presetsCount: number;
  onSelectTab: (tab: SettingsTabId) => void;
}

function getModeShortLabel(mode: ClockMode): string {
  switch (mode) {
    case ClockMode.Stopwatch:
      return 'Stopwatch';
    case ClockMode.Countdown:
      return 'Countdown';
    case ClockMode.TimeUntil:
      return 'Time Until';
    case ClockMode.Interval:
      return 'Interval';
    case ClockMode.Jujitsu:
      return 'Jujitsu';
    case ClockMode.FocusSession:
      return 'Focus';
    case ClockMode.AlarmClock:
      return 'Daily Alarm';
    case ClockMode.LiveClock:
      return 'Live Clock';
  }
}

function getProviderShortLabel(provider: MediaProvider): string {
  switch (provider) {
    case MediaProvider.Spotify:
      return 'Spotify';
    case MediaProvider.YouTube:
      return 'YouTube';
    case MediaProvider.AppleMusic:
      return 'Apple Music';
    case MediaProvider.Radio:
    default:
      return 'Live Radio';
  }
}

function getThemeShortLabel(settings: ClockSettings): string {
  const matched = COLOR_PRESETS.find(
    (p) =>
      p.clockColor.toLowerCase() === settings.clockColor.toLowerCase() &&
      p.bgColor.toLowerCase() === settings.bgColor.toLowerCase()
  );
  return matched ? matched.label : 'Custom LCD';
}

function SectionThumbnail({
  id,
  isSelected,
}: {
  id: SettingsTabId;
  isSelected: boolean;
}) {
  const frameClass = isSelected
    ? 'border-emerald-400/50 bg-slate-950 text-emerald-300'
    : 'border-slate-800 bg-slate-950/90 text-slate-400 group-hover:border-slate-700 group-hover:text-emerald-300/85';

  if (id === 'timer') {
    return (
      <div
        aria-hidden="true"
        className={`relative flex h-10 sm:h-12 w-full items-center justify-center overflow-hidden rounded-lg border transition-colors ${frameClass}`}
      >
        <svg
          viewBox="0 0 96 40"
          className="h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="6"
            y="6"
            width="84"
            height="28"
            rx="4"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
          {/* Mini 7-segment stylized 05:00 */}
          <text
            x="48"
            y="24"
            textAnchor="middle"
            fill="currentColor"
            fontFamily="monospace"
            fontSize="13"
            fontWeight="700"
            letterSpacing="1.5"
          >
            05:00
          </text>
          <polygon
            points="13,17 13,23 18,20"
            fill="currentColor"
            fillOpacity="0.75"
          />
        </svg>
      </div>
    );
  }

  if (id === 'presets') {
    return (
      <div
        aria-hidden="true"
        className={`relative flex h-10 sm:h-12 w-full items-center justify-center overflow-hidden rounded-lg border transition-colors ${frameClass}`}
      >
        <svg
          viewBox="0 0 96 40"
          className="h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="10"
            y="7"
            width="76"
            height="7"
            rx="2"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <rect
            x="14"
            y="9.5"
            width="22"
            height="2"
            rx="1"
            fill="currentColor"
          />
          <rect
            x="66"
            y="9.5"
            width="14"
            height="2"
            rx="1"
            fill="currentColor"
            fillOpacity="0.65"
          />

          <rect
            x="10"
            y="16.5"
            width="76"
            height="7"
            rx="2"
            fill="currentColor"
            fillOpacity="0.34"
          />
          <rect
            x="14"
            y="19"
            width="28"
            height="2"
            rx="1"
            fill="currentColor"
          />
          <rect
            x="66"
            y="19"
            width="14"
            height="2"
            rx="1"
            fill="currentColor"
            fillOpacity="0.85"
          />

          <rect
            x="10"
            y="26"
            width="76"
            height="7"
            rx="2"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <rect
            x="14"
            y="28.5"
            width="18"
            height="2"
            rx="1"
            fill="currentColor"
            fillOpacity="0.8"
          />
          <rect
            x="66"
            y="28.5"
            width="14"
            height="2"
            rx="1"
            fill="currentColor"
            fillOpacity="0.55"
          />
        </svg>
      </div>
    );
  }

  if (id === 'display') {
    return (
      <div
        aria-hidden="true"
        className={`relative flex h-10 sm:h-12 w-full items-center justify-center overflow-hidden rounded-lg border transition-colors ${frameClass}`}
      >
        <svg
          viewBox="0 0 96 40"
          className="h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="8"
            y="7"
            width="52"
            height="26"
            rx="4"
            fill="currentColor"
            fillOpacity="0.14"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <text
            x="34"
            y="24"
            textAnchor="middle"
            fill="currentColor"
            fontFamily="monospace"
            fontSize="12"
            fontWeight="700"
          >
            88:88
          </text>
          {/* Theme Swatch Tiles */}
          <rect
            x="66"
            y="8"
            width="10"
            height="10"
            rx="2.5"
            fill="#38ff9c"
            fillOpacity="0.9"
          />
          <rect
            x="78"
            y="8"
            width="10"
            height="10"
            rx="2.5"
            fill="#ffb400"
            fillOpacity="0.9"
          />
          <rect
            x="66"
            y="21"
            width="10"
            height="10"
            rx="2.5"
            fill="#ff4242"
            fillOpacity="0.85"
          />
          <rect
            x="78"
            y="21"
            width="10"
            height="10"
            rx="2.5"
            fill="#f8fafc"
            fillOpacity="0.85"
          />
        </svg>
      </div>
    );
  }

  if (id === 'radio') {
    return (
      <div
        aria-hidden="true"
        className={`relative flex h-10 sm:h-12 w-full items-center justify-center overflow-hidden rounded-lg border transition-colors ${frameClass}`}
      >
        <svg
          viewBox="0 0 96 40"
          className="h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          {/* FM Tuner Scale + Equalizer Bars */}
          <line
            x1="10"
            y1="31"
            x2="86"
            y2="31"
            stroke="currentColor"
            strokeOpacity="0.28"
            strokeWidth="1.2"
          />
          <rect x="14" y="19" width="5" height="9" rx="1" fill="currentColor" fillOpacity="0.55" />
          <rect x="23" y="12" width="5" height="16" rx="1" fill="currentColor" fillOpacity="0.85" />
          <rect x="32" y="16" width="5" height="12" rx="1" fill="currentColor" fillOpacity="0.65" />
          <rect x="41" y="9" width="5" height="19" rx="1" fill="currentColor" />
          <rect x="50" y="14" width="5" height="14" rx="1" fill="currentColor" fillOpacity="0.8" />
          <rect x="59" y="18" width="5" height="10" rx="1" fill="currentColor" fillOpacity="0.6" />
          <rect x="68" y="11" width="5" height="17" rx="1" fill="currentColor" fillOpacity="0.9" />
          <rect x="77" y="20" width="5" height="8" rx="1" fill="currentColor" fillOpacity="0.5" />
        </svg>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative flex h-10 sm:h-12 w-full items-center justify-center overflow-hidden rounded-lg border transition-colors ${frameClass}`}
    >
      <svg
        viewBox="0 0 96 40"
        className="h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        {/* Piezo Speaker + Double-Tap Rings */}
        <path
          d="M18 16H23L30 10V30L23 24H18V16Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        <path
          d="M35 15C37.5 17.5 37.5 22.5 35 25"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M40 11.5C44.5 16 44.5 24 40 28.5"
          stroke="currentColor"
          strokeOpacity="0.65"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle
          cx="68"
          cy="20"
          r="4"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <circle
          cx="68"
          cy="20"
          r="8.5"
          stroke="currentColor"
          strokeOpacity="0.65"
          strokeWidth="1.4"
        />
        <circle
          cx="68"
          cy="20"
          r="13"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

export function SettingsSectionGallery({
  activeTab,
  settings,
  presetsCount,
  onSelectTab,
}: SettingsSectionGalleryProps) {
  const items: readonly {
    id: SettingsTabId;
    label: string;
    summary: string;
  }[] = [
    {
      id: 'timer',
      label: 'Timer',
      summary: getModeShortLabel(settings.mode),
    },
    {
      id: 'presets',
      label: 'Presets',
      summary: `${presetsCount} saved`,
    },
    {
      id: 'display',
      label: 'Display',
      summary: getThemeShortLabel(settings),
    },
    {
      id: 'radio',
      label: 'Radio',
      summary: getProviderShortLabel(settings.media.activeProvider),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      summary: settings.alarmSoundEnabled ? 'Sound & Tap' : 'Muted · Tap',
    },
  ];

  return (
    <div className="shrink-0 border-b border-white/10 bg-slate-950/80 px-4 pb-3.5 sm:px-6">
      <div
        role="tablist"
        aria-label="Settings sections"
        data-testid="settings-gallery"
        className="grid grid-cols-5 gap-1.5 sm:gap-2.5"
      >
        {items.map((item) => {
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              data-testid={`gallery-card-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`group flex min-h-[68px] sm:min-h-[88px] min-w-0 flex-col items-stretch justify-between gap-1.5 rounded-xl border p-1.5 sm:p-2 text-left transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                isSelected
                  ? 'border-emerald-400 bg-emerald-400/12 text-white shadow-sm'
                  : 'border-slate-800/90 bg-slate-900/65 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <SectionThumbnail id={item.id} isSelected={isSelected} />
              <div className="flex min-w-0 flex-col px-0.5">
                <span
                  className={`truncate text-center sm:text-left text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                    isSelected ? 'text-emerald-300' : 'text-slate-200'
                  }`}
                >
                  {item.label}
                </span>
                <span className="hidden sm:block truncate text-[10px] text-slate-400 tabular-nums">
                  {item.summary}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
