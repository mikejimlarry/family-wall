import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { chores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = getDb(platform!.env.DB);
	const body = await request.json() as {
		completed?: boolean;
		title?: string;
		assignedTo?: string | null;
		dueDate?: string | null;
		sortOrder?: number;
	};

	const updates: Partial<typeof chores.$inferInsert> = {};
	if ('completed' in body) {
		updates.completed = body.completed;
		updates.completedAt = body.completed ? new Date() : null;
	}
	if ('title' in body) updates.title = body.title;
	if ('assignedTo' in body) updates.assignedTo = body.assignedTo;
	if ('dueDate' in body) updates.dueDate = body.dueDate;
	if ('sortOrder' in body) updates.sortOrder = body.sortOrder;

	const [updated] = await db
		.update(chores)
		.set(updates)
		.where(eq(chores.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Chore not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = getDb(platform!.env.DB);
	const deleted = await db.delete(chores).where(eq(chores.id, params.id)).returning();

	if (!deleted.length) throw error(404, 'Chore not found');
	return json({ ok: true });
};
