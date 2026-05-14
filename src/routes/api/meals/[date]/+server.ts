import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { mealPlan } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalNullableString, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

export const PUT: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) return json({ error: 'Invalid date' }, { status: 400 });
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		meal: requiredTrimmedString(body, 'meal'),
		notes: optionalNullableString(body, 'notes', 1000) ?? null
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const [row] = await db
		.insert(mealPlan)
		.values({ date: params.date, meal: body.meal, notes: body.notes })
		.onConflictDoUpdate({
			target: mealPlan.date,
			set: { meal: body.meal, notes: body.notes }
		})
		.returning();

	return json(row);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db.delete(mealPlan).where(eq(mealPlan.date, params.date)).returning();
	if (!deleted.length) throw error(404, 'Meal not found');
	return json({ ok: true });
};
