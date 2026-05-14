import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { chores } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalDateString, optionalEnum, optionalInteger, optionalStringArray, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

function parseAssignees(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v : [v];
	} catch { return [raw]; }
}

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db.select().from(chores).orderBy(asc(chores.sortOrder), asc(chores.createdAt));
	return json(rows.map(c => ({ ...c, assignedTo: parseAssignees(c.assignedTo) })));
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		title: requiredTrimmedString(body, 'title'),
		assignedTo: optionalStringArray(body, 'assignedTo') ?? [],
		dueDate: optionalDateString(body, 'dueDate') ?? null,
		recurrence: optionalEnum(body, 'recurrence', ['daily', 'weekly', 'monthly'] as const) ?? null,
		points: optionalInteger(body, 'points', 0, 100) ?? 1,
		sortOrder: optionalInteger(body, 'sortOrder', 0, 10000) ?? 0
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const assignedTo = body.assignedTo?.length ? JSON.stringify(body.assignedTo) : null;

	const [chore] = await db
		.insert(chores)
		.values({
			title: body.title,
			assignedTo,
			dueDate: body.dueDate ?? null,
			recurrence: body.recurrence ?? null,
			points: body.points ?? 1,
			sortOrder: body.sortOrder ?? 0
		})
		.returning();

	return json({ ...chore, assignedTo: parseAssignees(chore.assignedTo) }, { status: 201 });
};
