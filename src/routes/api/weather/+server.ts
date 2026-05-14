import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { fetchWeather, type WeatherConfig } from '$lib/weather';
import { requireAdmin } from '$lib/server/auth';
import { optionalEnum, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getSettings(db: Awaited<ReturnType<typeof getDatabase>>) {
	const all = await db.select().from(appSettings);
	const map = Object.fromEntries(all.map((r) => [r.key, r.value]));
	return map;
}

async function upsertSetting(
	db: Awaited<ReturnType<typeof getDatabase>>,
	key: string,
	value: string
) {
	await db
		.insert(appSettings)
		.values({ key, value })
		.onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const s = await getSettings(db);

	if (!s['weather.lat'] || !s['weather.lon']) {
		return json({ needsLocation: true });
	}

	// Return cached data if fresh enough
	if (s['weather.cache'] && s['weather.cache_at']) {
		const age = Date.now() - Number(s['weather.cache_at']);
		if (age < CACHE_TTL_MS) {
			try {
				return json(JSON.parse(s['weather.cache']));
			} catch {
				// Ignore corrupt cache and fetch fresh below.
			}
		}
	}

	// Fetch fresh
	const config: WeatherConfig = {
		lat: s['weather.lat'],
		lon: s['weather.lon'],
		city: s['weather.city'] ?? '',
		unit: (s['weather.unit'] as 'fahrenheit' | 'celsius') ?? 'fahrenheit'
	};

	try {
		const data = await fetchWeather(config);
		await upsertSetting(db, 'weather.cache', JSON.stringify(data));
		await upsertSetting(db, 'weather.cache_at', String(Date.now()));
		return json(data);
	} catch (err) {
		// Return stale cache rather than an error if we have it
		if (s['weather.cache']) {
			try {
				return json(JSON.parse(s['weather.cache']));
			} catch {
				// Fall through to the upstream error.
			}
		}
		return json({ error: String(err) }, { status: 502 });
	}
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => {
		const lat = requiredTrimmedString(body, 'lat', 32);
		const lon = requiredTrimmedString(body, 'lon', 32);
		const latNum = Number(lat);
		const lonNum = Number(lon);
		if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) throw new Error('lat is invalid');
		if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) throw new Error('lon is invalid');
		return {
			lat,
			lon,
			city: requiredTrimmedString(body, 'city', 120),
			unit: optionalEnum(body, 'unit', ['fahrenheit', 'celsius'] as const) ?? 'fahrenheit'
		};
	});
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	await upsertSetting(db, 'weather.lat', body.lat);
	await upsertSetting(db, 'weather.lon', body.lon);
	await upsertSetting(db, 'weather.city', body.city);
	await upsertSetting(db, 'weather.unit', body.unit);
	// Clear cache so next GET fetches fresh
	await upsertSetting(db, 'weather.cache', '');
	await upsertSetting(db, 'weather.cache_at', '0');

	return json({ ok: true });
};
