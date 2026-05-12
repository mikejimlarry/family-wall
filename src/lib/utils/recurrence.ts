import type { CalendarEvent } from '$lib/types';

export type RecurrenceRule = {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval: number;
	daysOfWeek: number[];        // 0=Sun…6=Sat; only used when frequency='weekly'
	monthlyType: 'date' | 'last'; // only used when frequency='monthly'
	monthlyDate: number;          // 1–31; only used when monthlyType='date'
	endType: 'never' | 'count' | 'until';
	endCount: number;
	endDate: string;              // YYYY-MM-DD; only used when endType='until'
};

function toDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateOnly(dateStr: string): Date {
	return new Date(dateStr.substring(0, 10) + 'T12:00:00');
}

function lastDayOf(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/** Expand a single recurring event into concrete instances within [winStart, winEnd]. */
function expandEvent(event: CalendarEvent, rule: RecurrenceRule, winStart: Date, winEnd: Date): CalendarEvent[] {
	const base = dateOnly(event.startDate);
	const instances: CalendarEvent[] = [];
	const MAX = 1500;

	const endByDate = rule.endType === 'until' && rule.endDate ? dateOnly(rule.endDate) : null;

	function withinEnd(d: Date, count: number): boolean {
		if (rule.endType === 'count' && count >= rule.endCount) return false;
		if (endByDate && d > endByDate) return false;
		return true;
	}

	function push(d: Date, count: number) {
		if (d < base || d > winEnd || instances.length >= MAX) return;
		if (!withinEnd(d, count)) return;
		const dateStr = toDateStr(d);
		instances.push({ ...event, id: `${event.id}_${dateStr}`, startDate: dateStr, endDate: null });
	}

	if (rule.frequency === 'weekly' && rule.daysOfWeek.length > 0) {
		// Walk week-by-week aligned to the interval from the base week
		const baseSun = new Date(base);
		baseSun.setDate(base.getDate() - base.getDay());
		baseSun.setHours(12, 0, 0, 0);

		const winSun = new Date(winStart);
		winSun.setDate(winStart.getDate() - winStart.getDay());
		winSun.setHours(12, 0, 0, 0);

		// Align winSun to the interval cycle
		const weeksBehind = Math.round((winSun.getTime() - baseSun.getTime()) / (7 * 86_400_000));
		const offset = ((weeksBehind % rule.interval) + rule.interval) % rule.interval;
		const startSun = new Date(winSun);
		startSun.setDate(winSun.getDate() - offset * 7);

		let weekSun = new Date(startSun);
		let count = 0;

		outer: while (weekSun <= winEnd) {
			for (const dow of [...rule.daysOfWeek].sort()) {
				const d = new Date(weekSun);
				d.setDate(weekSun.getDate() + dow);
				d.setHours(12, 0, 0, 0);
				if (d > winEnd) break outer;
				if (!withinEnd(d, count)) break outer;
				if (d >= base && d >= winStart) {
					push(d, count);
					count++;
				}
			}
			weekSun.setDate(weekSun.getDate() + 7 * rule.interval);
		}
	} else {
		let cur = new Date(base);
		cur.setHours(12, 0, 0, 0);
		let count = 0;

		while (cur <= winEnd && instances.length < MAX) {
			if (!withinEnd(cur, count)) break;
			if (cur >= winStart) {
				push(cur, count);
			}
			count++;

			// Advance
			if (rule.frequency === 'daily') {
				cur.setDate(cur.getDate() + rule.interval);
			} else if (rule.frequency === 'weekly') {
				cur.setDate(cur.getDate() + 7 * rule.interval);
			} else if (rule.frequency === 'monthly') {
				const nextMonth = cur.getMonth() + rule.interval;
				const nextYear  = cur.getFullYear() + Math.floor(nextMonth / 12);
				const m = ((nextMonth % 12) + 12) % 12;
				const targetDay = rule.monthlyType === 'last'
					? lastDayOf(nextYear, m)
					: Math.min(rule.monthlyDate, lastDayOf(nextYear, m));
				cur = new Date(nextYear, m, targetDay, 12, 0, 0, 0);
			} else {
				cur.setFullYear(cur.getFullYear() + rule.interval);
			}
		}
	}

	return instances;
}

/** Expand all events in the list, generating instances for recurring ones within the window. */
export function expandRecurring(
	events: CalendarEvent[],
	winStart: Date,
	winEnd: Date
): CalendarEvent[] {
	const result: CalendarEvent[] = [];
	for (const event of events) {
		if (!event.recurrenceRule) {
			result.push(event);
			continue;
		}
		try {
			const rule = JSON.parse(event.recurrenceRule) as RecurrenceRule;
			result.push(...expandEvent(event, rule, winStart, winEnd));
		} catch {
			result.push(event); // malformed rule — treat as non-recurring
		}
	}
	return result;
}
