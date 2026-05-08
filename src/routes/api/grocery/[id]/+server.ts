import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { groceryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		name?: string;
		checked?: boolean;
		sortOrder?: number;
	};

	const updates: Partial<typeof groceryItems.$inferInsert> = {};
	if ('name' in body && body.name?.trim()) updates.name = body.name.trim();
	if ('checked' in body) {
		updates.checked = body.checked;
		updates.checkedAt = body.checked ? new Date() : null;
	}
	if ('sortOrder' in body) updates.sortOrder = body.sortOrder;

	const [updated] = await db
		.update(groceryItems)
		.set(updates)
		.where(eq(groceryItems.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Item not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db.delete(groceryItems).where(eq(groceryItems.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Item not found');
	return json({ ok: true });
};
