import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalBoolean, parseValidated, readJsonObject } from '$lib/server/validation';

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		pinned: optionalBoolean(body, 'pinned')
	}));
	if (!parsed.ok) return parsed.response;
	if (parsed.value.pinned === undefined) return json({ error: 'pinned is required' }, { status: 400 });

	const [updated] = await db
		.update(messages)
		.set({ pinned: parsed.value.pinned })
		.where(eq(messages.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Message not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db.delete(messages).where(eq(messages.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Message not found');
	return json({ ok: true });
};
