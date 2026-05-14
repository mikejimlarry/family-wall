import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { routines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalEnum, optionalInteger, optionalNullableString, optionalTrimmedString, parseValidated, readJsonObject } from '$lib/server/validation';

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		title: optionalTrimmedString(body, 'title'),
		memberId: optionalNullableString(body, 'memberId'),
		period: optionalEnum(body, 'period', ['morning', 'afternoon', 'evening'] as const),
		sortOrder: optionalInteger(body, 'sortOrder', 0, 10000)
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;
	const has = (key: string) => Object.prototype.hasOwnProperty.call(raw.value, key);

	const updates: Partial<typeof routines.$inferInsert> = {};
	if (body.title !== undefined) updates.title = body.title;
	if (has('memberId')) updates.memberId = body.memberId ?? null;
	if (has('period')) updates.period = body.period;
	if (has('sortOrder')) updates.sortOrder = body.sortOrder;

	const [updated] = await db.update(routines).set(updates).where(eq(routines.id, params.id)).returning();
	if (!updated) throw error(404, 'Routine not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db.delete(routines).where(eq(routines.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Routine not found');
	return json({ ok: true });
};
