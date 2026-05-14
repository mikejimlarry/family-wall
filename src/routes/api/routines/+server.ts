import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { routines } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalEnum, optionalInteger, optionalNullableString, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db.select().from(routines).orderBy(asc(routines.sortOrder), asc(routines.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		title: requiredTrimmedString(body, 'title'),
		memberId: optionalNullableString(body, 'memberId') ?? null,
		period: optionalEnum(body, 'period', ['morning', 'afternoon', 'evening'] as const),
		sortOrder: optionalInteger(body, 'sortOrder', 0, 10000) ?? 0
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;
	const period = body.period;
	if (!period) return json({ error: 'period is required' }, { status: 400 });

	const [row] = await db.insert(routines).values({
		title: body.title,
		memberId: body.memberId,
		period,
		sortOrder: body.sortOrder,
	}).returning();

	return json(row, { status: 201 });
};
