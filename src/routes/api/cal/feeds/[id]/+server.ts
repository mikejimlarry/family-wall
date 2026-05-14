import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { calendarFeeds, events } from '$lib/server/db/schema';
import { and, eq, like } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalColor, optionalTrimmedString, parseValidated, readJsonObject } from '$lib/server/validation';

export const PATCH: RequestHandler = async ({ params, platform, request, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		color: optionalColor(body, 'color'),
		name: optionalTrimmedString(body, 'name')
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const updated = await db
		.update(calendarFeeds)
		.set({ ...(body.color && { color: body.color }), ...(body.name && { name: body.name }) })
		.where(eq(calendarFeeds.id, params.id))
		.returning();

	if (!updated.length) throw error(404, 'Feed not found');
	return json(updated[0]);
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);

	// Remove all imported events for this feed
	await db.delete(events).where(
		and(eq(events.source, 'ical'), like(events.externalId, `${params.id}:%`))
	);

	const deleted = await db
		.delete(calendarFeeds)
		.where(eq(calendarFeeds.id, params.id))
		.returning();

	if (!deleted.length) throw error(404, 'Feed not found');
	return json({ ok: true });
};
