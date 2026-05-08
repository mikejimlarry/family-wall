import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers, chores, events } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';

export const load: PageServerLoad = async ({ platform }) => {
	const db = await getDatabase(platform);

	const now = new Date();
	const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
		.toISOString()
		.split('T')[0];
	const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
		.toISOString()
		.split('T')[0];

	const [members, allChores, allEvents] = await Promise.all([
		db.select().from(familyMembers),
		db.select().from(chores),
		db
			.select()
			.from(events)
			.where(and(gte(events.startDate, rangeStart), lte(events.startDate, rangeEnd)))
	]);

	return { members, chores: allChores, events: allEvents };
};
