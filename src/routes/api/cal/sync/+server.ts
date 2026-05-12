import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { syncFeed } from '$lib/server/ical-sync';

/** POST /api/cal/sync  — body: { feedId: string } */
export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { feedId?: string };

	if (!body.feedId) return json({ error: 'feedId required' }, { status: 400 });

	const [feed] = await db.select().from(calendarFeeds).where(eq(calendarFeeds.id, body.feedId));
	if (!feed) throw error(404, 'Feed not found');

	try {
		const { count } = await syncFeed(db, feed);
		return json({ ok: true, count });
	} catch (e) {
		return json({ error: String(e) }, { status: 502 });
	}
};
