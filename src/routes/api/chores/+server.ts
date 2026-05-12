import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { chores } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

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

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		title?: string;
		assignedTo?: string[];
		dueDate?: string;
		recurrence?: string;
		points?: number;
		sortOrder?: number;
	};

	if (!body.title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const assignedTo = body.assignedTo?.length ? JSON.stringify(body.assignedTo) : null;

	const [chore] = await db
		.insert(chores)
		.values({
			title: body.title.trim(),
			assignedTo,
			dueDate: body.dueDate ?? null,
			recurrence: body.recurrence ?? null,
			points: body.points ?? 1,
			sortOrder: body.sortOrder ?? 0
		})
		.returning();

	return json({ ...chore, assignedTo: parseAssignees(chore.assignedTo) }, { status: 201 });
};
