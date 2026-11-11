import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIDNIGHT_THEME_COLORS,
  computeSolarTimes,
  evaluateSolarNightPhase,
  resolveScheduledThemeColors,
  sanitizeGeoCoordinates,
  sanitizeSolarScheduleSettings,
} from './solar';

test('computeSolarTimes calculates accurate sunrise and sunset and handles polar latitudes', () => {
  // London (51.5074, -0.1278) on June 21: sunrise precedes sunset with long summer daylight
  const summerDate = new Date(2026, 5, 21, 12, 0, 0);
  const londonCoords = { latitude: 51.5074, longitude: -0.1278 };
  const londonSummer = computeSolarTimes(summerDate, londonCoords);

  assert.equal(londonSummer.polarState, 'normal');
  assert.ok(londonSummer.sunriseDate !== null);
  assert.ok(londonSummer.sunsetDate !== null);
  const daylightHours =
    (londonSummer.sunsetDate!.getTime() - londonSummer.sunriseDate!.getTime()) /
    3_600_000;
  assert.ok(daylightHours > 16 && daylightHours < 17);
  assert.match(londonSummer.sunriseLabel, /^\d{2}:\d{2}$/);
  assert.match(londonSummer.sunsetLabel, /^\d{2}:\d{2}$/);

  // Tromsø (69.6492, 18.9553) in mid-December experiences Polar Night
  const arcticWinter = computeSolarTimes(new Date(2026, 11, 21, 12, 0, 0), {
    latitude: 69.6492,
    longitude: 18.9553,
  });
  assert.equal(arcticWinter.polarState, 'polar-night');

  // Tromsø in mid-June experiences Midnight Sun (Polar Day)
  const arcticSummer = computeSolarTimes(new Date(2026, 5, 21, 12, 0, 0), {
    latitude: 69.6492,
    longitude: 18.9553,
  });
  assert.equal(arcticSummer.polarState, 'polar-day');
});

test('resolveScheduledThemeColors switches to Midnight at sunset and restores preferred theme at sunrise', () => {
  const coords = { latitude: 40.7128, longitude: -74.006 };
  const baseDate = new Date(2026, 9, 15, 12, 0, 0);
  const solar = computeSolarTimes(baseDate, coords);
  assert.ok(solar.sunriseDate && solar.sunsetDate);

  // 10 minutes after sunrise -> daytime -> uses user's preferred theme
  const afterSunrise = new Date(solar.sunriseDate!.getTime() + 10 * 60_000);
  const dayResult = resolveScheduledThemeColors({
    now: afterSunrise,
    preferredClockColor: '#38ff9c',
    preferredBgColor: '#0b0f12',
    solarSchedule: { enabled: true, coords },
  });
  assert.equal(dayResult.isMidnightScheduledActive, false);
  assert.equal(dayResult.activeClockColor, '#38ff9c');
  assert.equal(dayResult.activeBgColor, '#0b0f12');

  // 5 minutes after sunset -> nighttime -> switches to Midnight (#ffb400 / #050a14)
  const afterSunset = new Date(solar.sunsetDate!.getTime() + 5 * 60_000);
  const nightResult = resolveScheduledThemeColors({
    now: afterSunset,
    preferredClockColor: '#38ff9c',
    preferredBgColor: '#0b0f12',
    solarSchedule: { enabled: true, coords },
  });
  assert.equal(nightResult.isMidnightScheduledActive, true);
  assert.equal(nightResult.activeClockColor, MIDNIGHT_THEME_COLORS.clockColor);
  assert.equal(nightResult.activeBgColor, MIDNIGHT_THEME_COLORS.bgColor);

  // 10 minutes before sunrise -> still nighttime -> keeps Midnight theme
  const beforeSunrise = new Date(solar.sunriseDate!.getTime() - 10 * 60_000);
  const preDawnState = evaluateSolarNightPhase(beforeSunrise, coords);
  assert.equal(preDawnState.isNight, true);

  // Disabled schedule at night -> uses preferred theme immediately
  const disabledResult = resolveScheduledThemeColors({
    now: afterSunset,
    preferredClockColor: '#ff4242',
    preferredBgColor: '#100809',
    solarSchedule: { enabled: false, coords },
  });
  assert.equal(disabledResult.isMidnightScheduledActive, false);
  assert.equal(disabledResult.activeClockColor, '#ff4242');
  assert.equal(disabledResult.activeBgColor, '#100809');
});

test('sanitizeGeoCoordinates and sanitizeSolarScheduleSettings clamp and validate inputs', () => {
  assert.deepEqual(
    sanitizeGeoCoordinates({ latitude: 95.123456, longitude: -190.98765 }),
    { latitude: 90, longitude: -180 }
  );
  assert.equal(sanitizeGeoCoordinates({ latitude: Number.NaN, longitude: 10 }), null);
  assert.deepEqual(sanitizeSolarScheduleSettings(null), {
    enabled: false,
    coords: null,
  });

  // Cross-timezone check: London (51.5074, -0.1278) at 17:05 UTC on Nov 11 is after sunset (night),
  // while at 12:00 UTC on Nov 11 is solar noon (day), regardless of host timezone
  const londonCoords = { latitude: 51.5074, longitude: -0.1278 };
  const londonEveningUtc = new Date('2026-11-11T17:05:00Z');
  const londonNoonUtc = new Date('2026-11-11T12:00:00Z');
  assert.equal(evaluateSolarNightPhase(londonEveningUtc, londonCoords).isNight, true);
  assert.equal(evaluateSolarNightPhase(londonNoonUtc, londonCoords).isNight, false);
});
