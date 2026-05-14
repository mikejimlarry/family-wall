import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { syncFeed } from '$lib/server/ical-sync';
import { requireAdmin } from '$lib/server/auth';
import { readJsonObject } from '$lib/server/validation';

/** POST /api/cal/sync  — body: { feedId: string } */
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const feedId = raw.value.feedId;

	if (typeof feedId !== 'string' || !feedId.trim()) return json({ error: 'feedId required' }, { status: 400 });

	const [feed] = await db.select().from(calendarFeeds).where(eq(calendarFeeds.id, feedId));
	if (!feed) throw error(404, 'Feed not found');

	try {
		const { count } = await syncFeed(db, feed);
		return json({ ok: true, count });
	} catch (e) {
		return json({ error: String(e) }, { status: 502 });
	}
};
