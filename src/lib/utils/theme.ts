export type ThemeMode    = 'dark' | 'light' | 'auto';
export type AutoType     = 'sunset' | 'schedule';

/** Per-day window when LIGHT mode is active, e.g. { lightFrom: '07:00', lightUntil: '21:00' } */
export type DaySchedule  = { lightFrom: string; lightUntil: string };

/** 7-element array indexed 0 (Sun) … 6 (Sat) */
export type WeekSchedule = DaySchedule[];

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const DEFAULT_SCHEDULE: WeekSchedule = Array.from({ length: 7 }, () => ({
	lightFrom:  '07:00',
	lightUntil: '21:00',
}));

/** Parse "HH:MM" → minutes past midnight */
function parseMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/** Current local time in minutes past midnight */
function nowMinutes(now: Date): number {
	return now.getHours() * 60 + now.getMinutes();
}

// ─── Sunrise / sunset ────────────────────────────────────────────────────────
// Simplified NOAA algorithm — accurate to ±1–2 minutes for most latitudes.

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

/**
 * Returns sunrise and sunset as minutes past LOCAL midnight.
 * Returns null if polar day/night (sun never sets/rises).
 */
export function getSunriseSunset(
	lat: number,
	lon: number,
	date: Date,
): { sunrise: number; sunset: number } | null {
	const year = date.getFullYear();
	const dayOfYear = Math.floor(
		(date.getTime() - new Date(year, 0, 0).getTime()) / 86_400_000,
	);

	// Solar declination (degrees)
	const declination = toRad(23.45 * Math.sin(toRad((360 / 365) * (dayOfYear - 81))));

	// Hour angle at sunrise/sunset (cos)
	const cosHA =
		(Math.cos(toRad(90.833)) - Math.sin(toRad(lat)) * Math.sin(declination)) /
		(Math.cos(toRad(lat)) * Math.cos(declination));

	if (cosHA <= -1) return { sunrise: 0,       sunset: 24 * 60 }; // midnight sun
	if (cosHA >=  1) return { sunrise: 12 * 60, sunset: 12 * 60 }; // polar night

	const hourAngleDeg = toDeg(Math.acos(cosHA));

	// Equation of time (minutes)
	const B = toRad((360 / 365) * (dayOfYear - 81));
	const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

	// Solar noon in UTC hours
	const solarNoonUTC = 12 - lon / 15 - eot / 60;

	const sunriseUTC = solarNoonUTC - hourAngleDeg / 15;
	const sunsetUTC  = solarNoonUTC + hourAngleDeg / 15;

	// Shift to local time via the browser's timezone offset
	const tzOffsetHours = -date.getTimezoneOffset() / 60;

	return {
		sunrise: Math.round((sunriseUTC + tzOffsetHours) * 60),
		sunset:  Math.round((sunsetUTC  + tzOffsetHours) * 60),
	};
}

// ─── Theme resolution ────────────────────────────────────────────────────────

export interface ThemeSettings {
	mode:     ThemeMode;
	autoType: AutoType;
	schedule: WeekSchedule;
	lat:      number | null;
	lon:      number | null;
}

/**
 * Given current settings and a timestamp, returns the active theme.
 * This is pure and testable — no side effects.
 */
export function resolveTheme(settings: ThemeSettings, now: Date = new Date()): 'light' | 'dark' {
	if (settings.mode === 'light') return 'light';
	if (settings.mode === 'dark')  return 'dark';

	// ── Auto mode ──────────────────────────────────────────────────────────
	const mins = nowMinutes(now);

	if (settings.autoType === 'sunset') {
		if (settings.lat == null || settings.lon == null) return 'dark';
		const ss = getSunriseSunset(settings.lat, settings.lon, now);
		if (!ss) return 'dark';
		return mins >= ss.sunrise && mins < ss.sunset ? 'light' : 'dark';
	}

	// Schedule mode
	const day = now.getDay(); // 0 = Sun
	const { lightFrom, lightUntil } = settings.schedule[day] ?? DEFAULT_SCHEDULE[0];
	const from  = parseMinutes(lightFrom);
	const until = parseMinutes(lightUntil);

	if (from < until) {
		return mins >= from && mins < until ? 'light' : 'dark';
	} else {
		// Overnight schedule (e.g. light from 22:00 to 06:00)
		return mins >= from || mins < until ? 'light' : 'dark';
	}
}

// ─── Settings serialisation ──────────────────────────────────────────────────

export function parseThemeSettings(raw: Record<string, string>): ThemeSettings {
	let schedule: WeekSchedule;
	try {
		schedule = JSON.parse(raw['theme.schedule'] ?? 'null') ?? DEFAULT_SCHEDULE;
	} catch {
		schedule = DEFAULT_SCHEDULE;
	}

	return {
		mode:     (raw['theme.mode']      as ThemeMode) ?? 'dark',
		autoType: (raw['theme.auto_type'] as AutoType)  ?? 'sunset',
		schedule,
		lat: raw['weather.lat'] ? Number(raw['weather.lat']) : null,
		lon: raw['weather.lon'] ? Number(raw['weather.lon']) : null,
	};
}
