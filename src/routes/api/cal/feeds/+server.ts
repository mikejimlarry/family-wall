import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { syncFeed } from '$lib/server/ical-sync';
import { requireAdmin } from '$lib/server/auth';
import { optionalColor, optionalTrimmedString, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

function normalizePublicFeedUrl(rawUrl: string): string {
	const normalized = rawUrl.replace(/^webcal:\/\//i, 'https://');
	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new Error('Invalid calendar URL');
	}
	if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Calendar URL must be http or https');
	const host = parsed.hostname.toLowerCase();
	const isPrivate =
		host === 'localhost' ||
		host.endsWith('.local') ||
		host === '127.0.0.1' ||
		host === '0.0.0.0' ||
		host.startsWith('10.') ||
		host.startsWith('192.168.') ||
		/^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
		host === '::1' ||
		host.startsWith('fc') ||
		host.startsWith('fd');
	if (isPrivate) throw new Error('Calendar URL must be publicly reachable');
	return parsed.toString();
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const feeds = await db.select().from(calendarFeeds).orderBy(asc(calendarFeeds.createdAt));
	return json(feeds);
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => {
		const url = normalizePublicFeedUrl(requiredTrimmedString(body, 'url', 2000));
		return {
			url,
			name: optionalTrimmedString(body, 'name') || new URL(url).hostname,
			color: optionalColor(body, 'color') ?? '#60a5fa'
		};
	});
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const [feed] = await db
		.insert(calendarFeeds)
		.values({ url: body.url, name: body.name, color: body.color })
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
