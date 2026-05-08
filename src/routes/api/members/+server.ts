import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { familyMembers } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const members = await db.select().from(familyMembers);
	return json(members);
};

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { name?: string; color?: string; emoji?: string };

	if (!body.name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const [member] = await db
		.insert(familyMembers)
		.values({
			name: body.name.trim(),
			color: body.color ?? '#60a5fa',
			emoji: body.emoji ?? '👤'
		})
		.returning();

	return json(member, { status: 201 });
};
