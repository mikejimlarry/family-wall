import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, eq, like, gte, lte } from 'drizzle-orm';

/** GET /api/cal/events?feedId=xxx  — returns ical events for a feed within the display window */
export const GET: RequestHandler = async ({ url, platform }) => {
	const feedId = url.searchParams.get('feedId');
	if (!feedId) return json({ error: 'feedId required' }, { status: 400 });

	const db = await getDatabase(platform);

	const now = new Date();
	const rangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
	const rangeEnd   = new Date(now.getFullYear(), now.getMonth() + 7, 0).toISOString().split('T')[0];

	const rows = await db
		.select()
		.from(events)
		.where(
			and(
				eq(events.source, 'ical'),
				like(events.externalId, `${feedId}:%`),
				gte(events.startDate, rangeStart),
				lte(events.startDate, rangeEnd)
			)
		);

	return json(rows);
};
