import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { routines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		title?: string;
		memberId?: string | null;
		period?: string;
		sortOrder?: number;
	};

	const updates: Partial<typeof routines.$inferInsert> = {};
	if ('title' in body)    updates.title    = body.title;
	if ('memberId' in body) updates.memberId = body.memberId;
	if ('period' in body)   updates.period   = body.period;
	if ('sortOrder' in body) updates.sortOrder = body.sortOrder;

	const [updated] = await db.update(routines).set(updates).where(eq(routines.id, params.id)).returning();
	if (!updated) throw error(404, 'Routine not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db.delete(routines).where(eq(routines.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Routine not found');
	return json({ ok: true });
};
