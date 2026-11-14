export interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export interface FullscreenCapableDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export interface RightSideUpwardSwipeInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  durationMs: number;
  viewportWidth: number;
  viewportHeight: number;
}

export function isStandaloneDisplayMode(
  win?: Pick<Window, 'matchMedia'> | null,
  nav?: (Navigator & { standalone?: boolean }) | { standalone?: boolean } | null
): boolean {
  if (nav && 'standalone' in nav && nav.standalone === true) {
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
      // Ignore matchMedia errors in non-standard environments
    }
  }
  return false;
}

export function canRequestNativeFullscreen(
  doc?: Partial<FullscreenCapableDocument> | null,
  el?: Partial<FullscreenCapableElement> | null
): boolean {
  if (!doc && !el) return false;
  if (doc?.fullscreenEnabled === false && doc?.webkitFullscreenEnabled !== true) {
    return false;
  }
  if (doc?.fullscreenEnabled === true || doc?.webkitFullscreenEnabled === true) {
    return true;
  }
  return (
    typeof el?.requestFullscreen === 'function' ||
    typeof el?.webkitRequestFullscreen === 'function'
  );
}

/**
 * Determines whether to show the corner Full Screen button:
 * - Always shown in standard browser tabs (uses native Fullscreen API + chromeless UI fallback)
 * - Shown in standalone Home Screen WebApps when the OS supports Element Fullscreen
 *   (e.g. iPadOS 16.4+, Android, Desktop PWAs) so users can hide the top system status bar.
 */
export function shouldShowFullscreenButton(params: {
  isStandalone: boolean;
  doc?: Partial<FullscreenCapableDocument> | null;
  el?: Partial<FullscreenCapableElement> | null;
}): boolean {
  if (!params.isStandalone) {
    return true;
  }
  return canRequestNativeFullscreen(params.doc, params.el);
}

export function getNativeFullscreenElement(
  doc?: FullscreenCapableDocument | null
): Element | null {
  if (!doc) return null;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export async function requestNativeFullscreen(
  el?: FullscreenCapableElement | null
): Promise<boolean> {
  if (!el) return false;
  try {
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen();
      return true;
    }
    if (typeof el.webkitRequestFullscreen === 'function') {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Expected in restricted iframes or mobile browsers without Element Fullscreen API
  }
  return false;
}

export async function exitNativeFullscreen(
  doc?: FullscreenCapableDocument | null
): Promise<boolean> {
  if (!doc || !getNativeFullscreenElement(doc)) {
    return false;
  }
  try {
    if (typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
      return true;
    }
    if (typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
      return true;
    }
  } catch {
    // Ignore if browser already left fullscreen
  }
  return false;
}

/**
 * Detects an upward (bottom-to-top) drag/swipe gesture performed on the right side
 * of the viewport to exit full screen mode.
 */
export function isExitFullscreenRightSwipe(
  input: RightSideUpwardSwipeInput
): boolean {
  const {
    startX,
    startY,
    endX,
    endY,
    durationMs,
    viewportWidth,
    viewportHeight,
  } = input;

  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endX) ||
    !Number.isFinite(endY) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return false;
  }

  if (durationMs < 10 || durationMs > 2500) {
    return false;
  }

  // Must start in the right region of the screen (right 45%) and remain on the right half
  if (startX < viewportWidth * 0.55 || endX < viewportWidth * 0.45) {
    return false;
  }

  // Must begin in the lower 70% of the screen and drag upward toward the top
  if (startY < viewportHeight * 0.3) {
    return false;
  }

  const upwardDistancePx = startY - endY;
  const minRequiredSwipePx = Math.min(90, Math.max(48, viewportHeight * 0.08));
  if (upwardDistancePx < minRequiredSwipePx) {
    return false;
  }

  // Ensure vertical upward motion dominates horizontal drift
  const horizontalDriftPx = Math.abs(endX - startX);
  if (horizontalDriftPx > upwardDistancePx * 0.85) {
    return false;
  }

  return true;
}
