import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers, chores, events, appSettings, groceryItems, mealPlan } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';
import type { WeatherData } from '$lib/weather';

const CACHE_TTL_MS = 10 * 60 * 1000;

export const load: PageServerLoad = async ({ platform }) => {
	const db = await getDatabase(platform);

	const now = new Date();
	// Load 6 months back and 6 months forward so calendar navigation feels populated
	const rangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1)
		.toISOString()
		.split('T')[0];
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 7, 0)
		.toISOString()
		.split('T')[0];

	// Meal plan: load 4 weeks back and 8 weeks forward
	const mealStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28).toISOString().split('T')[0];
	const mealEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 56).toISOString().split('T')[0];

	const [members, allChores, allEvents, settingsRows, allGrocery, allMeals] = await Promise.all([
		db.select().from(familyMembers),
		db.select().from(chores),
		db
			.select()
			.from(events)
			.where(and(gte(events.startDate, rangeStart), lte(events.startDate, rangeEnd))),
		db.select().from(appSettings),
		db.select().from(groceryItems),
		db.select().from(mealPlan).where(and(gte(mealPlan.date, mealStart), lte(mealPlan.date, mealEnd)))
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

	// Inject birthday events from family members
	const birthdayEvents = [];
	const startYear = new Date(rangeStart).getFullYear();
	const endYear = new Date(rangeEnd).getFullYear();

	for (const member of members) {
		if (!member.birthday) continue;
		const [, month, day] = member.birthday.split('-').map(Number);
		for (let year = startYear; year <= endYear; year++) {
			const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
			if (dateStr < rangeStart || dateStr > rangeEnd) continue;
			const birthYear = Number(member.birthday.split('-')[0]);
			const age = year - birthYear;
			birthdayEvents.push({
				id: `birthday-${member.id}-${year}`,
				title: `🎂 ${member.name}'s Birthday (${age})`,
				startDate: dateStr,
				endDate: null,
				allDay: true,
				memberId: member.id,
				source: 'birthday',
				externalId: null,
				createdAt: null
			});
		}
	}

	return {
		members,
		chores: allChores,
		events: [...allEvents, ...birthdayEvents],
		grocery: allGrocery,
		meals: allMeals,
		weather,
		hasWeatherLocation
	};
};
