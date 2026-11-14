export interface AppleDeviceDetectionInput {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

export interface AppleDeviceInfo {
  isAppleMobile: boolean;
  isIPad: boolean;
  isIPhone: boolean;
}

/**
 * Accurately detects iPadOS (including iPadOS 13+ desktop-class Safari where
 * userAgent reports Macintosh + maxTouchPoints > 1) as well as iPhone/iPod.
 */
export function detectAppleTouchDevice(
  input: AppleDeviceDetectionInput
): AppleDeviceInfo {
  const ua = (input.userAgent ?? '').toLowerCase();
  const platform = input.platform ?? '';
  const touchPoints = input.maxTouchPoints ?? 0;

  const explicitIPad = /\bipad\b/.test(ua);
  const desktopClassIPad =
    !explicitIPad &&
    (platform === 'MacIntel' || /\bmacintosh\b/.test(ua)) &&
    touchPoints > 1;

  const isIPad = explicitIPad || desktopClassIPad;
  const isIPhone = !isIPad && /\b(iphone|ipod)\b/.test(ua);

  return {
    isAppleMobile: isIPad || isIPhone,
    isIPad,
    isIPhone,
  };
}

export function isStandaloneWebApp(
  win?: Pick<Window, 'matchMedia'> | null,
  nav?: { standalone?: boolean } | null
): boolean {
  if (nav && nav.standalone === true) {
    return true;
  }
  if (win && typeof win.matchMedia === 'function') {
    try {
      if (
        win.matchMedia('(display-mode: standalone)').matches ||
        win.matchMedia('(display-mode: fullscreen)').matches
      ) {
        return true;
      }
    } catch {
      // Ignore unsupported media query environments
    }
  }
  return false;
}
