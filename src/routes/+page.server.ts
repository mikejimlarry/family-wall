import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers, chores, events, appSettings } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';
import type { WeatherData } from '$lib/weather';

const CACHE_TTL_MS = 10 * 60 * 1000;

export const load: PageServerLoad = async ({ platform }) => {
	const db = await getDatabase(platform);

	const now = new Date();
	const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
		.toISOString()
		.split('T')[0];
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
		.toISOString()
		.split('T')[0];

	const [members, allChores, allEvents, settingsRows] = await Promise.all([
		db.select().from(familyMembers),
		db.select().from(chores),
		db
			.select()
			.from(events)
			.where(and(gte(events.startDate, rangeStart), lte(events.startDate, rangeEnd))),
		db.select().from(appSettings)
	]);

	const s = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));

	// Serve weather from cache if fresh; otherwise let the client-side widget fetch it
	let weather: WeatherData | null = null;
	if (s['weather.cache'] && s['weather.cache_at']) {
		const age = Date.now() - Number(s['weather.cache_at']);
		if (age < CACHE_TTL_MS) {
			try { weather = JSON.parse(s['weather.cache']); } catch { /* ignore */ }
		}
	}

	const hasWeatherLocation = Boolean(s['weather.lat'] && s['weather.lon']);

	return { members, chores: allChores, events: allEvents, weather, hasWeatherLocation };
};
