import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { pinned?: boolean };

	const [updated] = await db
		.update(messages)
		.set({ pinned: body.pinned })
		.where(eq(messages.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Message not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db.delete(messages).where(eq(messages.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Message not found');
	return json({ ok: true });
};
