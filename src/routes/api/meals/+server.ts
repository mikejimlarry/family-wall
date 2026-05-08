import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { mealPlan } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = await getDatabase(platform);
	const from = url.searchParams.get('from');
	const to   = url.searchParams.get('to');

	let rows;
	if (from && to) {
		rows = await db
			.select()
			.from(mealPlan)
			.where(and(gte(mealPlan.date, from), lte(mealPlan.date, to)));
	} else {
		rows = await db.select().from(mealPlan);
	}
	return json(rows);
};
