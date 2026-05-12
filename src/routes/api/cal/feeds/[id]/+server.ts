import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds, events } from '$lib/server/db/schema';
import { and, eq, like } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, platform, request }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { color?: string; name?: string };

	const updated = await db
		.update(calendarFeeds)
		.set({ ...(body.color && { color: body.color }), ...(body.name && { name: body.name }) })
		.where(eq(calendarFeeds.id, params.id))
		.returning();

	if (!updated.length) throw error(404, 'Feed not found');
	return json(updated[0]);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);

	// Remove all imported events for this feed
	await db.delete(events).where(
		and(eq(events.source, 'ical'), like(events.externalId, `${params.id}:%`))
	);

	const deleted = await db
		.delete(calendarFeeds)
		.where(eq(calendarFeeds.id, params.id))
		.returning();

	if (!deleted.length) throw error(404, 'Feed not found');
	return json({ ok: true });
};
