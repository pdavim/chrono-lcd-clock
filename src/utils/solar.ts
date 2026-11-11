export const MIDNIGHT_THEME_COLORS = {
  clockColor: '#ffb400',
  bgColor: '#050a14',
} as const;

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface SolarScheduleSettings {
  enabled: boolean;
  coords: GeoCoordinates | null;
}

export const DEFAULT_SOLAR_SCHEDULE: SolarScheduleSettings = {
  enabled: false,
  coords: null,
};

export type PolarDayState = 'normal' | 'polar-day' | 'polar-night';

export interface SolarTimesResult {
  sunriseDate: Date | null;
  sunsetDate: Date | null;
  sunriseLabel: string;
  sunsetLabel: string;
  polarState: PolarDayState;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const OFFICIAL_ZENITH_DEG = 90.833;

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function formatClockHhMm(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function sanitizeGeoCoordinates(raw: unknown): GeoCoordinates | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Partial<GeoCoordinates>;
  if (
    typeof rec.latitude !== 'number' ||
    !Number.isFinite(rec.latitude) ||
    typeof rec.longitude !== 'number' ||
    !Number.isFinite(rec.longitude)
  ) {
    return null;
  }
  return {
    latitude: Math.min(90, Math.max(-90, Number(rec.latitude.toFixed(4)))),
    longitude: Math.min(180, Math.max(-180, Number(rec.longitude.toFixed(4)))),
  };
}

export function sanitizeSolarScheduleSettings(
  raw: unknown
): SolarScheduleSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SOLAR_SCHEDULE };
  }
  const rec = raw as Partial<SolarScheduleSettings>;
  return {
    enabled: typeof rec.enabled === 'boolean' ? rec.enabled : false,
    coords: sanitizeGeoCoordinates(rec.coords),
  };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDayOfYear(year: number, monthZeroIndexed: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, monthZeroIndexed, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

/**
 * Computes local astronomical sunrise and sunset times for the calendar day of `date`
 * using the NOAA solar position equations for official zenith (90.833°).
 */
export function computeSolarTimes(
  date: Date,
  coords: GeoCoordinates
): SolarTimesResult {
  const cleanCoords = sanitizeGeoCoordinates(coords);
  if (!cleanCoords) {
    return {
      sunriseDate: null,
      sunsetDate: null,
      sunriseLabel: '--:--',
      sunsetLabel: '--:--',
      polarState: 'normal',
    };
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const daysInYear = isLeapYear(year) ? 366 : 365;
  const dayOfYear = getDayOfYear(year, month, day);
  const gamma = ((2 * Math.PI) / daysInYear) * (dayOfYear - 1);

  const eqTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const declRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Clamp latitude slightly away from +/-90° singularities so tan/cos remain finite
  const safeLatDeg = Math.min(89.8, Math.max(-89.8, cleanCoords.latitude));
  const latRad = safeLatDeg * DEG_TO_RAD;

  const cosHourAngle =
    Math.cos(OFFICIAL_ZENITH_DEG * DEG_TO_RAD) /
      (Math.cos(latRad) * Math.cos(declRad)) -
    Math.tan(latRad) * Math.tan(declRad);

  if (cosHourAngle > 1) {
    return {
      sunriseDate: null,
      sunsetDate: null,
      sunriseLabel: 'Polar Night',
      sunsetLabel: 'Polar Night',
      polarState: 'polar-night',
    };
  }

  if (cosHourAngle < -1) {
    return {
      sunriseDate: null,
      sunsetDate: null,
      sunriseLabel: 'Midnight Sun',
      sunsetLabel: 'Midnight Sun',
      polarState: 'polar-day',
    };
  }

  const hourAngleDeg = Math.acos(cosHourAngle) * RAD_TO_DEG;

  // Use local noon's timezone offset on this calendar date
  const localNoon = new Date(year, month, day, 12, 0, 0, 0);
  const tzOffsetMinutes = -localNoon.getTimezoneOffset();

  const sunriseLocalMinutes =
    720 -
    4 * (cleanCoords.longitude + hourAngleDeg) -
    eqTimeMinutes +
    tzOffsetMinutes;
  const sunsetLocalMinutes =
    720 -
    4 * (cleanCoords.longitude - hourAngleDeg) -
    eqTimeMinutes +
    tzOffsetMinutes;

  const sunriseDate = new Date(
    year,
    month,
    day,
    0,
    0,
    Math.round(sunriseLocalMinutes * 60),
    0
  );
  const sunsetDate = new Date(
    year,
    month,
    day,
    0,
    0,
    Math.round(sunsetLocalMinutes * 60),
    0
  );

  return {
    sunriseDate,
    sunsetDate,
    sunriseLabel: formatClockHhMm(sunriseDate),
    sunsetLabel: formatClockHhMm(sunsetDate),
    polarState: 'normal',
  };
}

export function evaluateSolarNightPhase(
  now: Date,
  coords: GeoCoordinates
): { isNight: boolean; solar: SolarTimesResult } {
  const solar = computeSolarTimes(now, coords);

  if (solar.polarState === 'polar-night') {
    return { isNight: true, solar };
  }
  if (solar.polarState === 'polar-day') {
    return { isNight: false, solar };
  }
  if (!solar.sunriseDate || !solar.sunsetDate) {
    return { isNight: false, solar };
  }

  const DAY_MS = 86_400_000;
  const nowMs = now.getTime();
  const riseMs = solar.sunriseDate.getTime();
  const setMs = solar.sunsetDate.getTime();
  const daylightDurationMs = Math.max(0, Math.min(DAY_MS, setMs - riseMs));
  const elapsedSinceSunriseMs = (((nowMs - riseMs) % DAY_MS) + DAY_MS) % DAY_MS;

  return {
    isNight: elapsedSinceSunriseMs >= daylightDurationMs,
    solar,
  };
}

export function resolveScheduledThemeColors(params: {
  now: Date;
  preferredClockColor: string;
  preferredBgColor: string;
  solarSchedule: SolarScheduleSettings;
}): {
  activeClockColor: string;
  activeBgColor: string;
  isMidnightScheduledActive: boolean;
  solar: SolarTimesResult | null;
} {
  const { now, preferredClockColor, preferredBgColor, solarSchedule } = params;

  if (!solarSchedule.enabled || !solarSchedule.coords) {
    return {
      activeClockColor: preferredClockColor,
      activeBgColor: preferredBgColor,
      isMidnightScheduledActive: false,
      solar: solarSchedule.coords
        ? computeSolarTimes(now, solarSchedule.coords)
        : null,
    };
  }

  const { isNight, solar } = evaluateSolarNightPhase(now, solarSchedule.coords);

  if (isNight) {
    return {
      activeClockColor: MIDNIGHT_THEME_COLORS.clockColor,
      activeBgColor: MIDNIGHT_THEME_COLORS.bgColor,
      isMidnightScheduledActive: true,
      solar,
    };
  }

  return {
    activeClockColor: preferredClockColor,
    activeBgColor: preferredBgColor,
    isMidnightScheduledActive: false,
    solar,
  };
}
