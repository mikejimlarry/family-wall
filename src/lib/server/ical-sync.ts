import { parseIcal } from '$lib/ical';
import { events, calendarFeeds } from '$lib/server/db/schema';
import { and, eq, like } from 'drizzle-orm';
import type { AppDb } from '$lib/server/db';

// Only import events within this window (keeps DB lean)
const IMPORT_DAYS_BACK    = 60;
const IMPORT_DAYS_FORWARD = 365;

function offsetDate(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().split('T')[0];
}

export async function syncFeed(
	db: AppDb,
	feed: { id: string; url: string; name: string }
): Promise<{ count: number }> {
	// Normalise webcal:// → https://
	const url = feed.url.replace(/^webcal:\/\//i, 'https://');

	const res = await fetch(url, {
		headers: { 'User-Agent': 'FamilyWall/1.0 (calendar sync)' },
		signal: AbortSignal.timeout(20_000),
	});

	if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

	const text = await res.text();
	const parsed = parseIcal(text);

	// Filter to a reasonable date window
	const minDate = offsetDate(-IMPORT_DAYS_BACK);
	const maxDate = offsetDate(IMPORT_DAYS_FORWARD);
	const inWindow = parsed.filter(e => e.startDate >= minDate && e.startDate <= maxDate);

	// Replace all existing events for this feed
	await db.delete(events).where(
		and(
			eq(events.source, 'ical'),
			like(events.externalId, `${feed.id}:%`)
		)
	);

	if (inWindow.length > 0) {
		await db.insert(events).values(
			inWindow.map(e => ({
				title: e.title,
				startDate: e.startDate,
				allDay: e.allDay,
				source: 'ical',
				externalId: `${feed.id}:${e.uid}`,
			}))
		);
	}

	await db
		.update(calendarFeeds)
		.set({ lastSyncedAt: new Date() })
		.where(eq(calendarFeeds.id, feed.id));

	return { count: inWindow.length };
}
