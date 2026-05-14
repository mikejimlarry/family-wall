import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalColor, optionalDateString, optionalEnum, optionalTrimmedString, parseValidated, readJsonObject } from '$lib/server/validation';

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		name: optionalTrimmedString(body, 'name'),
		color: optionalColor(body, 'color'),
		emoji: optionalTrimmedString(body, 'emoji', 12),
		birthday: optionalDateString(body, 'birthday'),
		role: optionalEnum(body, 'role', ['parent', 'child', 'guest'] as const)
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;
	const has = (key: string) => Object.prototype.hasOwnProperty.call(raw.value, key);

	const updates: Partial<typeof familyMembers.$inferInsert> = {};
	if (body.name !== undefined) updates.name = body.name;
	if (has('color')) updates.color = body.color;
	if (has('emoji')) updates.emoji = body.emoji;
	if (has('birthday')) updates.birthday = body.birthday ?? null;
	if (has('role')) updates.role = body.role;

	const [updated] = await db
		.update(familyMembers)
		.set(updates)
		.where(eq(familyMembers.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Member not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db
		.delete(familyMembers)
		.where(eq(familyMembers.id, params.id))
		.returning();

	if (!deleted.length) throw error(404, 'Member not found');
	return json({ ok: true });
};
