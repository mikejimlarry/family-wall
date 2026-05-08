import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { groceryItems } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db
		.select()
		.from(groceryItems)
		.orderBy(asc(groceryItems.checked), asc(groceryItems.sortOrder), asc(groceryItems.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { name?: string; sortOrder?: number };

	if (!body.name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const [item] = await db
		.insert(groceryItems)
		.values({ name: body.name.trim(), sortOrder: body.sortOrder ?? 0 })
		.returning();

	return json(item, { status: 201 });
};

// DELETE with ?checked=true clears all checked items
export const DELETE: RequestHandler = async ({ url, platform }) => {
	const db = await getDatabase(platform);
	if (url.searchParams.get('checked') === 'true') {
		await db.delete(groceryItems).where(eq(groceryItems.checked, true));
		return json({ ok: true });
	}
	return json({ error: 'Missing query param' }, { status: 400 });
};
