import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalBoolean, optionalNullableString, parseValidated, readJsonObject, requiredTrimmedString } from '$lib/server/validation';

export const GET: RequestHandler = async ({ platform }) => {
	const db = await getDatabase(platform);
	const rows = await db.select().from(messages).orderBy(desc(messages.pinned), desc(messages.createdAt));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		text: requiredTrimmedString(body, 'text', 1000),
		authorId: optionalNullableString(body, 'authorId') ?? null,
		authorName: optionalNullableString(body, 'authorName') ?? null,
		pinned: optionalBoolean(body, 'pinned') ?? false
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const [row] = await db
		.insert(messages)
		.values({
			text: body.text,
			authorId: body.authorId,
			authorName: body.authorName || null,
			pinned: body.pinned
		})
		.returning();

	return json(row, { status: 201 });
};
