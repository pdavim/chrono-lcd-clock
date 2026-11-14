import React, { useState } from 'react';
import { Check, Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'corner' | 'settings';
  visibilityClass?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'settings',
  visibilityClass = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isIPad, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const deviceLabel = isIPad ? 'iPad' : isIOS ? 'iPhone / iPad' : 'Home Screen';

  const handleTriggerAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isInstallable) {
      void install();
      return;
    }
    setShowGuideModal(true);
  };

  if (variant === 'corner') {
    if (isInstalled || (!isInstallable && !isIOS)) {
      return null;
    }

    return (
      <>
        <button
          type="button"
          id="pwa-install-corner-btn"
          aria-label={
            isInstallable
              ? 'Install Chrono80 app'
              : `Add Chrono80 to ${deviceLabel} Home Screen`
          }
          title={
            isInstallable
              ? 'Install Chrono80 as an app'
              : `Add to ${deviceLabel} Home Screen`
          }
          onClick={handleTriggerAction}
          className={`min-h-[48px] min-w-[48px] p-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-current/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${visibilityClass}`}
        >
          <Download className="h-7 w-7 stroke-[2]" aria-hidden="true" />
        </button>

        {showGuideModal && (
          <InstallGuideModal
            isIPad={isIPad}
            isIOS={isIOS}
            onClose={() => setShowGuideModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div
      data-testid="pwa-install-card"
      className="flex flex-col gap-2.5 border-t border-white/8 pt-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-200">
            Standalone App Experience
          </span>
          <span className="text-[11px] text-slate-400">
            {isInstalled
              ? 'Running full-screen as an installed Home Screen web app'
              : 'Launch from iPad, iPhone, or desktop without browser bars'}
          </span>
        </div>

        {isInstalled ? (
          <span
            data-testid="pwa-installed-status"
            className="flex h-11 items-center gap-1.5 px-2 text-xs font-semibold settings-accent-text whitespace-nowrap shrink-0"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Installed</span>
          </span>
        ) : (
          <button
            type="button"
            id="pwa-install-settings-btn"
            onClick={handleTriggerAction}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer settings-accent-soft settings-focus-outline"
          >
            {isInstallable ? (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Install App</span>
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>{isIPad ? 'Add to iPad' : 'Home Screen Guide'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {showGuideModal && (
        <InstallGuideModal
          isIPad={isIPad}
          isIOS={isIOS}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </div>
  );
};

interface InstallGuideModalProps {
  isIPad: boolean;
  isIOS: boolean;
  onClose: () => void;
}

function InstallGuideModal({ isIPad, isIOS, onClose }: InstallGuideModalProps) {
  const titleText = isIPad
    ? 'Add Chrono80 to iPad Home Screen'
    : isIOS
      ? 'Add Chrono80 to iPhone / iPad'
      : 'Install Chrono80 as a Web App';

  return (
    <div
      data-testid="pwa-guide-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-guide-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-5 text-slate-100 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h3
            id="pwa-guide-title"
            className="text-sm font-semibold tracking-tight text-white"
          >
            {titleText}
          </h3>
          <button
            type="button"
            aria-label="Close install instructions"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ol className="mt-3.5 flex flex-col gap-3 text-xs text-slate-300">
          <li className="flex items-start gap-2.5">
            <Share
              className="mt-0.5 h-4 w-4 shrink-0 settings-accent-text"
              aria-hidden="true"
            />
            <span>
              <strong>1. Open Share menu:</strong> On iPad or iPhone Safari, tap
              the <strong>Share</strong> icon in the browser toolbar.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <PlusSquare
              className="mt-0.5 h-4 w-4 shrink-0 settings-accent-text"
              aria-hidden="true"
            />
            <span>
              <strong>2. Add to Home Screen:</strong> Choose{' '}
              <strong>Add to Home Screen</strong> (or{' '}
              <strong>Install App</strong> in Chrome / Edge) and tap{' '}
              <strong>Add</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Smartphone
              className="mt-0.5 h-4 w-4 shrink-0 settings-accent-text"
              aria-hidden="true"
            />
            <span>
              <strong>3. Hide top status bar:</strong> Launch{' '}
              <strong>Chrono80</strong> from your Home Screen. On iPadOS, tap
              once (or use the Full Screen icon) to hide the top status bar; on
              iPhone, rotate to Landscape for chromeless full screen.
            </span>
          </li>
        </ol>

        <button
          type="button"
          id="close-pwa-guide-btn"
          onClick={onClose}
          className="mt-5 h-11 w-full rounded-xl border text-xs font-semibold transition-all cursor-pointer settings-accent-solid settings-focus-outline"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
