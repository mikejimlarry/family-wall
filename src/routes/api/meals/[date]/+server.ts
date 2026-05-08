import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { mealPlan } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { meal?: string; notes?: string };

	if (!body.meal?.trim()) {
		return json({ error: 'Meal is required' }, { status: 400 });
	}

	const [row] = await db
		.insert(mealPlan)
		.values({ date: params.date, meal: body.meal.trim(), notes: body.notes ?? null })
		.onConflictDoUpdate({
			target: mealPlan.date,
			set: { meal: body.meal.trim(), notes: body.notes ?? null }
		})
		.returning();

	return json(row);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db.delete(mealPlan).where(eq(mealPlan.date, params.date)).returning();
	if (!deleted.length) throw error(404, 'Meal not found');
	return json({ ok: true });
};
