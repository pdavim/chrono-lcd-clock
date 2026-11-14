import React from 'react';
import { Maximize, Smartphone } from 'lucide-react';
import {
  FullscreenCapableDocument,
  FullscreenCapableElement,
  canRequestNativeFullscreen,
} from '../utils/fullscreen';
import { PWAInstallButton } from './PWAInstallButton';

interface AboutSettingsPanelProps {
  autoFullscreenWebApp: boolean;
  isFullscreen: boolean;
  onToggleAutoFullscreenWebApp: () => void;
  onEnterFullscreenNow: () => void;
}

export function AboutSettingsPanel({
  autoFullscreenWebApp,
  isFullscreen,
  onToggleAutoFullscreenWebApp,
  onEnterFullscreenNow,
}: AboutSettingsPanelProps) {
  const supportsElementFullscreen =
    typeof document !== 'undefined' &&
    canRequestNativeFullscreen(
      document as FullscreenCapableDocument,
      document.documentElement as FullscreenCapableElement
    );

  return (
    <div
      id="panel-about"
      role="tabpanel"
      aria-labelledby="tab-about"
      className="flex flex-col gap-5"
    >
      {/* Identity & Craft */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-white">
          Chrono80 LCD Timer
        </h3>
        <p className="text-xs leading-relaxed text-slate-300">
          Precision full-screen digital chronometer inspired by 1980s quartz
          sport instruments. Built mobile- and tablet-first for workouts,
          Jujitsu &amp; Kumite rounds, Pomodoro focus blocks, studio timekeeping,
          and bedside wake alarms.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-slate-400">
          <span>8 Clock Modes</span>
          <span aria-hidden="true">·</span>
          <span>Offline WebApp Ready</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Drift 60fps Quartz Loop</span>
        </div>
      </div>

      {/* Touch & Keyboard Gesture Reference */}
      <div className="flex flex-col gap-2.5 border-t border-white/8 pt-4">
        <h4 className="text-xs font-semibold text-slate-200">
          Touch &amp; Keyboard Controls
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">
              Single Tap Clock Face
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Starts or pauses any active timer mode immediately.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">
              Double Tap Clock Face
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Resets the active timer back to its starting duration.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">
              Right-Edge Swipe Up
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Drag upward on the right half of the screen (or press Esc) to exit
              full screen.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-white">
              Keyboard Shortcuts
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Space to start or pause · R to reset · Esc to close or exit full
              screen.
            </p>
          </div>
        </div>
      </div>

      {/* iOS & iPadOS Full-Screen Status Bar Controls & Guidance */}
      <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200">
              Hide Top Status Bar in WebApp
            </span>
            <span className="text-[11px] text-slate-400">
              Requests native chromeless full screen on first tap when installed
            </span>
          </div>
          <button
            id="about-webapp-fullscreen-switch"
            type="button"
            role="switch"
            aria-checked={autoFullscreenWebApp}
            aria-label="Hide Top Status Bar in WebApp"
            onClick={onToggleAutoFullscreenWebApp}
            className={`flex h-11 min-w-[84px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-focus-outline ${
              autoFullscreenWebApp
                ? 'settings-accent-soft'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            <span>{autoFullscreenWebApp ? 'On' : 'Off'}</span>
          </button>
        </div>

        {supportsElementFullscreen && !isFullscreen && (
          <button
            type="button"
            id="about-enter-fullscreen-btn"
            onClick={onEnterFullscreenNow}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer settings-accent-solid settings-focus-outline"
          >
            <Maximize className="h-4 w-4" aria-hidden="true" />
            <span>Enter Full Screen &amp; Hide System Bars</span>
          </button>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-slate-800/90 bg-slate-900/55 p-3 text-[11px] leading-relaxed text-slate-300">
          <p>
            <strong className="text-white">iPadOS Home Screen App:</strong> Tap
            the top-right Full Screen icon (or tap the clock once with Auto Full
            Screen enabled) to hide the top iPad time &amp; battery status bar.
          </p>
          <p>
            <strong className="text-white">iPhone Home Screen App:</strong>{' '}
            Rotate your iPhone to <strong className="text-white">Landscape</strong>{' '}
            orientation to hide the top iOS time/battery bar completely. In
            Portrait mode, Apple&apos;s iOS system policy keeps the hardware
            Dynamic Island / notch status icons visible over Chrono80&apos;s
            seamless full-bleed background.
          </p>
        </div>
      </div>

      {/* Standalone App Install / Status */}
      <PWAInstallButton variant="settings" />
    </div>
  );
}
