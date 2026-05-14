import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/auth';
import { optionalColor, optionalDateString, optionalEnum, optionalTrimmedString, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const members = await db.select().from(familyMembers);
	return json(members);
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		name: requiredTrimmedString(body, 'name'),
		color: optionalColor(body, 'color') ?? '#60a5fa',
		emoji: optionalTrimmedString(body, 'emoji', 12) ?? '👤',
		birthday: optionalDateString(body, 'birthday') ?? null,
		role: optionalEnum(body, 'role', ['parent', 'child', 'guest'] as const) ?? 'child'
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const [member] = await db
		.insert(familyMembers)
		.values({
			name: body.name,
			color: body.color,
			emoji: body.emoji,
			birthday: body.birthday,
			role: body.role
		})
		.returning();

	return json(member, { status: 201 });
};
