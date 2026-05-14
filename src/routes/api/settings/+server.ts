import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/server/auth';

const ALLOWED_KEYS = new Set([
	'theme.mode',
	'theme.auto_type',
	'theme.schedule',
	'weather.lat',
	'weather.lon',
	'weather.city',
	'weather.unit',
	'admin.pin'
]);

/** PATCH /api/settings — upsert one or more app_settings keys */
export const PATCH: RequestHandler = async ({ request, platform, cookies }) => {
	const db   = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const body = await request.json() as Record<string, unknown>;
	const entries = Object.entries(body);
	for (const [key, value] of entries) {
		if (!ALLOWED_KEYS.has(key)) return json({ error: `Unsupported setting: ${key}` }, { status: 400 });
		if (typeof value !== 'string') return json({ error: `${key} must be a string` }, { status: 400 });
		if (value.length > 5000) return json({ error: `${key} is too long` }, { status: 400 });
	}

	await Promise.all(
		entries.map(([key, value]) =>
			db
				.insert(appSettings)
				.values({ key, value: value as string })
				.onConflictDoUpdate({ target: appSettings.key, set: { value: value as string, updatedAt: new Date() } })
		),
	);

	return json({ ok: true });
};
