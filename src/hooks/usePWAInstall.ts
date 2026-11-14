import { useCallback, useEffect, useState } from 'react';
import {
  AppleDeviceInfo,
  detectAppleTouchDevice,
  isStandaloneWebApp,
} from '../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isStandaloneWebApp(
      window,
      window.navigator as unknown as { standalone?: boolean }
    );
  });
  const [appleDevice] = useState<AppleDeviceInfo>(() => {
    if (typeof navigator === 'undefined') {
      return { isAppleMobile: false, isIPad: false, isIPhone: false };
    }
    return detectAppleTouchDevice({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  });

  useEffect(() => {
    const nav = window.navigator as unknown as { standalone?: boolean };
    const syncStandaloneState = () => {
      const standalone = isStandaloneWebApp(window, nav);
      setIsInstalled(standalone);
      if (standalone) {
        setDeferredPrompt(null);
      }
    };

    syncStandaloneState();

    const standaloneMql = window.matchMedia('(display-mode: standalone)');
    const fullscreenMql = window.matchMedia('(display-mode: fullscreen)');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneMql.addEventListener?.('change', syncStandaloneState);
    fullscreenMql.addEventListener?.('change', syncStandaloneState);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneMql.removeEventListener?.('change', syncStandaloneState);
      fullscreenMql.removeEventListener?.('change', syncStandaloneState);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS: appleDevice.isAppleMobile,
    isIPad: appleDevice.isIPad,
    isIPhone: appleDevice.isIPhone,
    install,
  };
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
