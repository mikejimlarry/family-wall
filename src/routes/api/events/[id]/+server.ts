import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);
	const deleted = await db.delete(events).where(eq(events.id, params.id)).returning();

	if (!deleted.length) throw error(404, 'Event not found');
	return json({ ok: true });
};
