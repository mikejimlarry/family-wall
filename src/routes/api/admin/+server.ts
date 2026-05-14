import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { clearAdminSession, getAdminPin, setAdminSession } from '$lib/server/auth';
import { readJsonObject } from '$lib/server/validation';

/** POST /api/admin — verify PIN, returns { ok: true } or 401 */
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const db = await getDatabase(platform);
	const parsed = await readJsonObject(request);
	if (!parsed.ok) return parsed.response;

	const pin = parsed.value.pin;
	const storedPin = await getAdminPin(db);

	if (storedPin && typeof pin === 'string' && pin === storedPin) {
		await setAdminSession(db, cookies, platform);
		return json({ ok: true });
	}
	return json({ error: 'Wrong PIN' }, { status: 401 });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	clearAdminSession(cookies);
	return json({ ok: true });
};
