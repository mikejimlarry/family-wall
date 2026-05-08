import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { chores } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform }) => {
	const db = getDb(platform!.env.DB);
	const rows = await db.select().from(chores).orderBy(asc(chores.sortOrder), asc(chores.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = getDb(platform!.env.DB);
	const body = await request.json() as {
		title?: string;
		assignedTo?: string;
		dueDate?: string;
		recurrence?: string;
		sortOrder?: number;
	};

	if (!body.title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const [chore] = await db
		.insert(chores)
		.values({
			title: body.title.trim(),
			assignedTo: body.assignedTo ?? null,
			dueDate: body.dueDate ?? null,
			recurrence: body.recurrence ?? null,
			sortOrder: body.sortOrder ?? 0
		})
		.returning();

	return json(chore, { status: 201 });
};
