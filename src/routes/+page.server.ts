import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers, chores, events, appSettings, groceryItems, mealPlan, messages, calendarFeeds, routines, routineCompletions } from '$lib/server/db/schema';
import { and, gte, lte, desc, eq, asc } from 'drizzle-orm';
import type { WeatherData } from '$lib/weather';

const CACHE_TTL_MS     = 10 * 60 * 1000;

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

	// Local date string (avoids UTC-offset skew from toISOString())
	const todayStr = (() => {
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const d = String(now.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	})();

	const [members, allChores, allEvents, settingsRows, allGrocery, allMeals, allMessages, feeds, allRoutines, todayCompletions] = await Promise.all([
		db.select().from(familyMembers),
		db.select().from(chores),
		db
			.select()
			.from(events)
			.where(and(gte(events.startDate, rangeStart), lte(events.startDate, rangeEnd))),
		db.select().from(appSettings),
		db.select().from(groceryItems),
		db.select().from(mealPlan).where(and(gte(mealPlan.date, mealStart), lte(mealPlan.date, mealEnd))),
		db.select().from(messages).orderBy(desc(messages.pinned), desc(messages.createdAt)),
		db.select().from(calendarFeeds),
		db.select().from(routines).orderBy(asc(routines.sortOrder), asc(routines.createdAt)),
		db.select().from(routineCompletions).where(eq(routineCompletions.date, todayStr))
	]);

	const s = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));

	// Expose raw theme-related settings to the client for initial render
	const themeSettings: Record<string, string> = {};
	for (const key of ['theme.mode', 'theme.auto_type', 'theme.schedule', 'weather.lat', 'weather.lon']) {
		if (s[key] != null) themeSettings[key] = s[key];
	}

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

	function parseAssignees(raw: string | null): string[] {
		if (!raw) return [];
		try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [v]; }
		catch { return [raw]; }
	}

	return {
		members,
		chores: allChores.map(c => ({ ...c, assignedTo: parseAssignees(c.assignedTo) })),
		events: [...allEvents, ...birthdayEvents],
		grocery: allGrocery,
		meals: allMeals,
		messages: allMessages,
		feeds,
		routines: allRoutines,
		completions: todayCompletions,
		todayStr,
		themeSettings,
		weather,
		hasWeatherLocation
	};
};
