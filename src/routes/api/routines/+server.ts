import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { routines } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db.select().from(routines).orderBy(asc(routines.sortOrder), asc(routines.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		title?: string;
		memberId?: string | null;
		period?: string;
		sortOrder?: number;
	};

	if (!body.title?.trim()) return json({ error: 'Title is required' }, { status: 400 });
	if (!['morning', 'afternoon', 'evening'].includes(body.period ?? '')) {
		return json({ error: 'Invalid period' }, { status: 400 });
	}

	const [row] = await db.insert(routines).values({
		title: body.title.trim(),
		memberId: body.memberId ?? null,
		period: body.period!,
		sortOrder: body.sortOrder ?? 0,
	}).returning();

	return json(row, { status: 201 });
};
