import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fetchWeather, type WeatherConfig } from '$lib/weather';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getSettings(db: Awaited<ReturnType<typeof getDatabase>>) {
	const rows = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'weather.lat'));
	// Fetch all weather keys at once
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
			return json(JSON.parse(s['weather.cache']));
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
		if (s['weather.cache']) return json(JSON.parse(s['weather.cache']));
		return json({ error: String(err) }, { status: 502 });
	}
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		lat?: string;
		lon?: string;
		city?: string;
		unit?: string;
	};

	if (!body.lat || !body.lon) {
		return json({ error: 'lat and lon are required' }, { status: 400 });
	}

	await upsertSetting(db, 'weather.lat', body.lat);
	await upsertSetting(db, 'weather.lon', body.lon);
	await upsertSetting(db, 'weather.city', body.city ?? '');
	await upsertSetting(db, 'weather.unit', body.unit ?? 'fahrenheit');
	// Clear cache so next GET fetches fresh
	await upsertSetting(db, 'weather.cache', '');
	await upsertSetting(db, 'weather.cache_at', '0');

	return json({ ok: true });
};
