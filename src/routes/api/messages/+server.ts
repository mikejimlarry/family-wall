import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db.select().from(messages).orderBy(desc(messages.pinned), desc(messages.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { text?: string; authorId?: string | null; authorName?: string | null; pinned?: boolean };

	if (!body.text?.trim()) {
		return json({ error: 'Text is required' }, { status: 400 });
	}

	const [row] = await db
		.insert(messages)
		.values({
			text: body.text.trim(),
			authorId: body.authorId ?? null,
			authorName: body.authorName?.trim() || null,
			pinned: body.pinned ?? false
		})
		.returning();

	return json(row, { status: 201 });
};
