import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, gte, lte } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalBoolean, optionalDateString, optionalNullableString, parseValidated, readJsonObject, requiredDateString, requiredTrimmedString } from '$lib/server/validation';

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

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		title: requiredTrimmedString(body, 'title'),
		startDate: requiredDateString(body, 'startDate'),
		endDate: optionalDateString(body, 'endDate') ?? null,
		allDay: optionalBoolean(body, 'allDay') ?? true,
		memberId: optionalNullableString(body, 'memberId') ?? null,
		recurrenceRule: optionalNullableString(body, 'recurrenceRule', 500) ?? null
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	if (body.endDate && body.endDate < body.startDate) {
		return json({ error: 'endDate cannot be before startDate' }, { status: 400 });
	}

	const [event] = await db
		.insert(events)
		.values({
			title: body.title,
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
