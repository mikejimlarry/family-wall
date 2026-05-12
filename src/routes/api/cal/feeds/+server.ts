import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { syncFeed } from '$lib/server/ical-sync';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const feeds = await db.select().from(calendarFeeds).orderBy(asc(calendarFeeds.createdAt));
	return json(feeds);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { url?: string; name?: string; color?: string };

	if (!body.url?.trim()) return json({ error: 'URL is required' }, { status: 400 });

	// Normalise webcal:// before storing
	const url = body.url.trim().replace(/^webcal:\/\//i, 'https://');
	const name = body.name?.trim() || new URL(url.replace(/^webcal:\/\//i, 'https://')).hostname;

	const [feed] = await db
		.insert(calendarFeeds)
		.values({ url, name, color: body.color ?? '#60a5fa' })
		.returning();

	// Kick off first sync immediately
	try {
		await syncFeed(db, feed);
	} catch (e) {
		// Return the feed even if sync fails — user can retry
		return json({ feed, syncError: String(e) }, { status: 201 }); // feed added, sync will retry
	}

	return json({ feed }, { status: 201 });
};
