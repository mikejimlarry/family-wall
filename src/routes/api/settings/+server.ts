import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';

/** PATCH /api/settings — upsert one or more app_settings keys */
export const PATCH: RequestHandler = async ({ request, platform }) => {
	const db   = await getDatabase(platform);
	const body = await request.json() as Record<string, string>;

	await Promise.all(
		Object.entries(body).map(([key, value]) =>
			db
				.insert(appSettings)
				.values({ key, value })
				.onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
		),
	);

	return json({ ok: true });
};
