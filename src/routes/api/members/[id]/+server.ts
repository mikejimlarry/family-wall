import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as {
		name?: string;
		color?: string;
		emoji?: string;
		birthday?: string | null;
		role?: string;
	};

	const updates: Partial<typeof familyMembers.$inferInsert> = {};
	if ('name' in body && body.name?.trim()) updates.name = body.name.trim();
	if ('color' in body) updates.color = body.color;
	if ('emoji' in body) updates.emoji = body.emoji;
	if ('birthday' in body) updates.birthday = body.birthday ?? null;
	if ('role' in body && ['parent', 'child', 'guest'].includes(body.role ?? '')) {
		updates.role = body.role as 'parent' | 'child' | 'guest';
	}

	const [updated] = await db
		.update(familyMembers)
		.set(updates)
		.where(eq(familyMembers.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Member not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = await getDatabase(platform);
	const deleted = await db
		.delete(familyMembers)
		.where(eq(familyMembers.id, params.id))
		.returning();

	if (!deleted.length) throw error(404, 'Member not found');
	return json({ ok: true });
};
