import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = await getDatabase(platform);
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	const rows = await db
		.select()
		.from(events)
		.where(
			start && end
				? and(gte(events.startDate, start), lte(events.startDate, end))
				: undefined
		);

	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		title?: string;
		startDate?: string;
		endDate?: string;
		allDay?: boolean;
		memberId?: string;
		recurrenceRule?: string | null;
	};

	if (!body.title?.trim() || !body.startDate) {
		return json({ error: 'Title and startDate are required' }, { status: 400 });
	}

	const [event] = await db
		.insert(events)
		.values({
			title: body.title.trim(),
			startDate: body.startDate,
			endDate: body.endDate ?? null,
			allDay: body.allDay ?? true,
			memberId: body.memberId ?? null,
			recurrenceRule: body.recurrenceRule ?? null,
			source: 'manual'
		})
		.returning();

	return json(event, { status: 201 });
};
