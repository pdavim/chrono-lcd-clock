import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRequestNativeFullscreen,
  exitNativeFullscreen,
  getNativeFullscreenElement,
  isExitFullscreenRightSwipe,
  isStandaloneDisplayMode,
  requestNativeFullscreen,
  shouldShowFullscreenButton,
} from './fullscreen';

test('isExitFullscreenRightSwipe recognizes bottom-to-top drags on the right side of the screen', () => {
  // Valid bottom-to-top drag on the right side (mobile 390x844)
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 340,
      startY: 760,
      endX: 335,
      endY: 520,
      durationMs: 240,
      viewportWidth: 390,
      viewportHeight: 844,
    }),
    true
  );

  // Valid bottom-to-top drag on the right side (desktop 1440x900)
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 1280,
      startY: 810,
      endX: 1265,
      endY: 480,
      durationMs: 320,
      viewportWidth: 1440,
      viewportHeight: 900,
    }),
    true
  );

  // Rejected: left side of screen
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 90,
      startY: 760,
      endX: 90,
      endY: 480,
      durationMs: 220,
      viewportWidth: 390,
      viewportHeight: 844,
    }),
    false
  );

  // Rejected: top-to-bottom downward swipe
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 340,
      startY: 320,
      endX: 340,
      endY: 700,
      durationMs: 220,
      viewportWidth: 390,
      viewportHeight: 844,
    }),
    false
  );

  // Rejected: short tap / micro movement
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 340,
      startY: 700,
      endX: 340,
      endY: 685,
      durationMs: 90,
      viewportWidth: 390,
      viewportHeight: 844,
    }),
    false
  );

  // Rejected: horizontal swipe
  assert.equal(
    isExitFullscreenRightSwipe({
      startX: 360,
      startY: 700,
      endX: 180,
      endY: 610,
      durationMs: 220,
      viewportWidth: 390,
      viewportHeight: 844,
    }),
    false
  );
});

test('isStandaloneDisplayMode and native fullscreen helpers handle browser and fallback states cleanly', async () => {
  assert.equal(
    isStandaloneDisplayMode(
      { matchMedia: () => ({ matches: false } as MediaQueryList) },
      {}
    ),
    false
  );
  assert.equal(
    isStandaloneDisplayMode(
      { matchMedia: () => ({ matches: true } as MediaQueryList) },
      {}
    ),
    true
  );

  let entered = false;
  let exited = false;
  const fakeEl = {
    requestFullscreen: async () => {
      entered = true;
    },
  } as unknown as HTMLElement;

  assert.equal(await requestNativeFullscreen(fakeEl), true);
  assert.equal(entered, true);

  const rejectingEl = {
    requestFullscreen: async () => {
      throw new Error('Blocked by iframe policy');
    },
  } as unknown as HTMLElement;
  assert.equal(await requestNativeFullscreen(rejectingEl), false);

  const fakeDoc = {
    fullscreenElement: fakeEl,
    exitFullscreen: async () => {
      exited = true;
    },
  } as unknown as Document;

  assert.equal(getNativeFullscreenElement(fakeDoc), fakeEl);
  assert.equal(await exitNativeFullscreen(fakeDoc), true);
  assert.equal(exited, true);

  // Standalone display-mode: fullscreen also counts as standalone WebApp
  assert.equal(
    isStandaloneDisplayMode(
      {
        matchMedia: (query: string) =>
          ({ matches: query === '(display-mode: fullscreen)' } as MediaQueryList),
      },
      {}
    ),
    true
  );

  // Browser mode always shows Full Screen button
  assert.equal(
    shouldShowFullscreenButton({ isStandalone: false, doc: null, el: null }),
    true
  );

  // iPadOS / Android standalone WebApp with Fullscreen API enabled keeps Full Screen button so status bar can be hidden
  assert.equal(
    canRequestNativeFullscreen({ webkitFullscreenEnabled: true }, {}),
    true
  );
  assert.equal(
    shouldShowFullscreenButton({
      isStandalone: true,
      doc: { webkitFullscreenEnabled: true },
      el: {},
    }),
    true
  );

  // iPhone standalone WebClip where Element Fullscreen is unsupported hides redundant Full Screen button
  assert.equal(
    shouldShowFullscreenButton({
      isStandalone: true,
      doc: { fullscreenEnabled: false },
      el: {},
    }),
    false
  );
});

