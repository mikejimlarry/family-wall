import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { groceryItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalBoolean, optionalEnum, optionalInteger, optionalTrimmedString, parseValidated, readJsonObject } from '$lib/server/validation';
import { GROCERY_CATEGORIES } from '$lib/utils/grocery';

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		name: optionalTrimmedString(body, 'name'),
		checked: optionalBoolean(body, 'checked'),
		category: optionalEnum(body, 'category', GROCERY_CATEGORIES),
		sortOrder: optionalInteger(body, 'sortOrder', 0, 10000)
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;
	const has = (key: string) => Object.prototype.hasOwnProperty.call(raw.value, key);

	const updates: Partial<typeof groceryItems.$inferInsert> = {};
	if (body.name) updates.name = body.name;
	if (has('category')) updates.category = body.category;
	if (has('checked')) {
		updates.checked = body.checked;
		updates.checkedAt = body.checked ? new Date() : null;
	}
	if (has('sortOrder')) updates.sortOrder = body.sortOrder;

	const [updated] = await db
		.update(groceryItems)
		.set(updates)
		.where(eq(groceryItems.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Item not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db.delete(groceryItems).where(eq(groceryItems.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Item not found');
	return json({ ok: true });
};
