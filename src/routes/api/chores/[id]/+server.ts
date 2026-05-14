import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/server/db';
import { chores, familyMembers } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { requireAdmin } from '$lib/server/auth';
import { optionalBoolean, optionalDateString, optionalEnum, optionalInteger, optionalStringArray, optionalTrimmedString, parseValidated, readJsonObject } from '$lib/server/validation';

function parseAssignees(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v : [v];
	} catch { return [raw]; }
}

function nextDueDate(current: string | null, recurrence: string): string {
	const base = current ? new Date(current + 'T12:00:00') : new Date();
	switch (recurrence) {
		case 'daily':   base.setDate(base.getDate() + 1); break;
		case 'weekly':  base.setDate(base.getDate() + 7); break;
		case 'monthly': base.setMonth(base.getMonth() + 1); break;
	}
	return base.toISOString().split('T')[0];
}

function localDateStr(d = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const raw = await readJsonObject(request);
	if (!raw.ok) return raw.response;
	const parsed = parseValidated(raw.value, (body) => ({
		completed: optionalBoolean(body, 'completed'),
		approved: optionalBoolean(body, 'approved'),
		rejected: optionalBoolean(body, 'rejected'),
		title: optionalTrimmedString(body, 'title'),
		assignedTo: optionalStringArray(body, 'assignedTo'),
		dueDate: optionalDateString(body, 'dueDate'),
		recurrence: body.recurrence === null || body.recurrence === ''
			? null
			: optionalEnum(body, 'recurrence', ['daily', 'weekly', 'monthly'] as const),
		points: optionalInteger(body, 'points', 0, 100),
		sortOrder: optionalInteger(body, 'sortOrder', 0, 10000)
	}));
	if (!parsed.ok) return parsed.response;
	const body = parsed.value;
	const has = (key: string) => Object.prototype.hasOwnProperty.call(raw.value, key);

	const [existing] = await db.select().from(chores).where(eq(chores.id, params.id));
	if (!existing) throw error(404, 'Chore not found');

	const updates: Partial<typeof chores.$inferInsert> = {};
	let awardMemberIds: string[] = [];
	let pointsToAward = 0;

	if (body.rejected) {
		updates.completed  = false;
		updates.completedAt = null;
		updates.approved   = false;
		updates.approvedAt  = null;
	} else {
		if (has('completed')) {
			updates.completed  = body.completed;
			updates.completedAt = body.completed ? new Date() : null;
		}
		if (has('approved') && body.approved) {
			const assignees = parseAssignees(existing.assignedTo);
			if (assignees.length > 0) {
				awardMemberIds = assignees;
				pointsToAward  = existing.points ?? 1;
			}
			updates.streakCount = (existing.streakCount ?? 0) + 1;
			updates.lastApprovedDate = localDateStr();

			if (existing.recurrence) {
				updates.completed  = false;
				updates.completedAt = null;
				updates.approved   = false;
				updates.approvedAt  = null;
				updates.dueDate    = nextDueDate(existing.dueDate, existing.recurrence);
			} else {
				updates.approved   = true;
				updates.approvedAt  = new Date();
			}
		} else if (has('approved')) {
			updates.approved   = body.approved;
			updates.approvedAt  = body.approved ? new Date() : null;
		}
	}

	if (body.title !== undefined) updates.title = body.title;
	if (has('assignedTo')) updates.assignedTo = body.assignedTo?.length ? JSON.stringify(body.assignedTo) : null;
	if (has('dueDate'))    updates.dueDate    = body.dueDate;
	if (has('recurrence')) updates.recurrence = body.recurrence ?? null;
	if (has('points'))     updates.points     = body.points;
	if (has('sortOrder'))  updates.sortOrder  = body.sortOrder;

	const [updated] = await db
		.update(chores)
		.set(updates)
		.where(eq(chores.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Chore not found');

	// Award points to every assigned member
	if (awardMemberIds.length > 0 && pointsToAward > 0) {
		await db
			.update(familyMembers)
			.set({ pointsEarned: sql`${familyMembers.pointsEarned} + ${pointsToAward}` })
			.where(inArray(familyMembers.id, awardMemberIds));
	}

	return json({ ...updated, assignedTo: parseAssignees(updated.assignedTo) });
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	const db = await getDatabase(platform);
	await requireAdmin(db, cookies, platform);
	const deleted = await db.delete(chores).where(eq(chores.id, params.id)).returning();
	if (!deleted.length) throw error(404, 'Chore not found');
	return json({ ok: true });
};
