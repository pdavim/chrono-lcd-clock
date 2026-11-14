import assert from 'node:assert/strict';
import test from 'node:test';
import { detectAppleTouchDevice, isStandaloneWebApp } from './pwa';

test('detectAppleTouchDevice identifies iPadOS 13+ desktop-class Safari, classic iPad, iPhone, and ignores desktop Mac', () => {
  // iPadOS 13+ desktop-class Safari (reports MacIntel + multi-touch)
  const modernIPad = detectAppleTouchDevice({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  });
  assert.deepEqual(modernIPad, {
    isAppleMobile: true,
    isIPad: true,
    isIPhone: false,
  });

  // Classic iPad userAgent
  const classicIPad = detectAppleTouchDevice({
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    platform: 'iPad',
    maxTouchPoints: 5,
  });
  assert.deepEqual(classicIPad, {
    isAppleMobile: true,
    isIPad: true,
    isIPhone: false,
  });

  // iPhone Safari
  const iphone = detectAppleTouchDevice({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    maxTouchPoints: 5,
  });
  assert.deepEqual(iphone, {
    isAppleMobile: true,
    isIPad: false,
    isIPhone: true,
  });

  // Standard MacBook / iMac (0 touch points)
  const desktopMac = detectAppleTouchDevice({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 0,
  });
  assert.deepEqual(desktopMac, {
    isAppleMobile: false,
    isIPad: false,
    isIPhone: false,
  });
});

test('isStandaloneWebApp detects iOS navigator.standalone and display-mode standalone/fullscreen', () => {
  assert.equal(isStandaloneWebApp(null, { standalone: true }), true);
  assert.equal(isStandaloneWebApp(null, { standalone: false }), false);

  const mockStandaloneWin = {
    matchMedia: (q: string) =>
      ({
        matches: q === '(display-mode: standalone)',
      }) as MediaQueryList,
  };
  assert.equal(isStandaloneWebApp(mockStandaloneWin, {}), true);

  const mockBrowserWin = {
    matchMedia: () => ({ matches: false }) as MediaQueryList,
  };
  assert.equal(isStandaloneWebApp(mockBrowserWin, {}), false);
});
