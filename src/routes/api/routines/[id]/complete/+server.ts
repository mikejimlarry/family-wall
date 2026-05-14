import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { routineCompletions } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalNullableString, parseValidated, readJsonObject, requiredDateString } from '$lib/server/validation';

/** POST — mark a routine done for a given date + member */
export const POST: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		date: requiredDateString(body, 'date'),
		memberId: optionalNullableString(body, 'memberId') ?? null
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const [row] = await db
		.insert(routineCompletions)
		.values({ routineId: params.id, memberId: body.memberId, date: body.date })
		.onConflictDoNothing()
		.returning();

	return json(row ?? { routineId: params.id, memberId: body.memberId, date: body.date }, { status: 201 });
};

/** DELETE — unmark a routine for a given date + member */
export const DELETE: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		date: requiredDateString(body, 'date'),
		memberId: optionalNullableString(body, 'memberId') ?? null
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;

	const memberClause = body.memberId
		? eq(routineCompletions.memberId, body.memberId)
		: isNull(routineCompletions.memberId);

	await db.delete(routineCompletions).where(
		and(
			eq(routineCompletions.routineId, params.id),
			eq(routineCompletions.date, body.date),
			memberClause
		)
	);

	return json({ ok: true });
};
