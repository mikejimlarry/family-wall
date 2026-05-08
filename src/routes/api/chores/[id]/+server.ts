import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { chores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

function nextDueDate(current: string | null, recurrence: string): string {
	const base = current ? new Date(current + 'T12:00:00') : new Date();
	switch (recurrence) {
		case 'daily':   base.setDate(base.getDate() + 1); break;
		case 'weekly':  base.setDate(base.getDate() + 7); break;
		case 'monthly': base.setMonth(base.getMonth() + 1); break;
	}
	return base.toISOString().split('T')[0];
}

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		completed?: boolean;
		approved?: boolean;
		rejected?: boolean;
		title?: string;
		assignedTo?: string | null;
		dueDate?: string | null;
		recurrence?: string | null;
		sortOrder?: number;
	};

	// Fetch the current chore upfront (needed for recurrence logic)
	const [existing] = await db.select().from(chores).where(eq(chores.id, params.id));
	if (!existing) throw error(404, 'Chore not found');

	const updates: Partial<typeof chores.$inferInsert> = {};

	if (body.rejected) {
		// Parent rejected — send back to todo
		updates.completed = false;
		updates.completedAt = null;
		updates.approved = false;
		updates.approvedAt = null;
	} else {
		if ('completed' in body) {
			updates.completed = body.completed;
			updates.completedAt = body.completed ? new Date() : null;
		}
		if ('approved' in body && body.approved) {
			if (existing.recurrence) {
				// Recurring chore: reset to todo with next due date instead of hiding it
				updates.completed = false;
				updates.completedAt = null;
				updates.approved = false;
				updates.approvedAt = null;
				updates.dueDate = nextDueDate(existing.dueDate, existing.recurrence);
			} else {
				updates.approved = true;
				updates.approvedAt = new Date();
			}
		} else if ('approved' in body) {
			updates.approved = body.approved;
			updates.approvedAt = body.approved ? new Date() : null;
		}
	}

	if ('title' in body)      updates.title = body.title;
	if ('assignedTo' in body) updates.assignedTo = body.assignedTo;
	if ('dueDate' in body)    updates.dueDate = body.dueDate;
	if ('recurrence' in body) updates.recurrence = body.recurrence;
	if ('sortOrder' in body)  updates.sortOrder = body.sortOrder;

	const [updated] = await db
		.update(chores)
		.set(updates)
		.where(eq(chores.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Chore not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db.delete(chores).where(eq(chores.id, params.id)).returning();

	if (!deleted.length) throw error(404, 'Chore not found');
	return json({ ok: true });
};
