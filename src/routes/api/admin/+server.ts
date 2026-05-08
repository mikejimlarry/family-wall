import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/** POST /api/admin — verify PIN, returns { ok: true } or 401 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const db = await getDatabase(platform);
	const body = await request.json() as { pin?: string };

	const row = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'admin.pin'))
		.then((r) => r[0]);

	const storedPin = row?.value ?? '1234';

	if (body.pin === storedPin) {
		return json({ ok: true });
	}
	return json({ error: 'Wrong PIN' }, { status: 401 });
};
