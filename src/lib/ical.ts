/**
 * Minimal iCal (.ics) parser.
 * Handles Google Calendar, iCloud, and standard CalDAV exports.
 */

export type ICalEvent = {
	uid: string;
	title: string;
	startDate: string; // YYYY-MM-DD
	allDay: boolean;
};

/** RFC 5545 line-unfolding: CRLF + whitespace = continuation */
function unfold(text: string): string {
	return text
		.replace(/\r\n/g, '\n')
		.replace(/\n[ \t]/g, '');
}

/** Unescape iCal text values */
function unescapeText(s: string): string {
	return s
		.replace(/\\n/gi, ' ')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\');
}

/**
 * Parse a DTSTART value (after the colon) into a local date string.
 * Handles:
 *   20260510               → all-day
 *   20260512T140000        → timed (local)
 *   20260512T140000Z       → timed (UTC, converted to the local date)
 */
function parseDateValue(value: string): { date: string; allDay: boolean } | null {
	const raw = value.trim();
	if (/^\d{8}T\d{6}Z$/.test(raw)) {
		const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`;
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return null;
		return {
			date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
			allDay: false
		};
	}
	const v = raw.replace(/Z$/, '');
	if (v.length < 8) return null;
	const date = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
	const allDay = !v.includes('T');
	return { date, allDay };
}

function addInterval(date: Date, freq: string, interval: number): Date {
	const next = new Date(date);
	if (freq === 'DAILY') next.setDate(next.getDate() + interval);
	if (freq === 'WEEKLY') next.setDate(next.getDate() + (7 * interval));
	if (freq === 'MONTHLY') next.setMonth(next.getMonth() + interval);
	if (freq === 'YEARLY') next.setFullYear(next.getFullYear() + interval);
	return next;
}

function toDate(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00`);
}

function localDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseRrule(value: string): Record<string, string> {
	return Object.fromEntries(
		value
			.split(';')
			.map((part) => part.split('='))
			.filter(([key, val]) => key && val)
			.map(([key, val]) => [key.toUpperCase(), val])
	);
}

function expandRecurring(base: ICalEvent, rrule: string | undefined): ICalEvent[] {
	if (!rrule) return [base];
	const rule = parseRrule(rrule);
	const freq = rule.FREQ;
	if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [base];

	const interval = Math.max(1, Number(rule.INTERVAL ?? 1));
	const maxCount = Math.min(Math.max(1, Number(rule.COUNT ?? 400)), 400);
	const until = rule.UNTIL ? parseDateValue(rule.UNTIL)?.date : null;
	const untilTime = until ? toDate(until).getTime() : Number.POSITIVE_INFINITY;

	const events: ICalEvent[] = [];
	let cursor = toDate(base.startDate);
	for (let i = 0; i < maxCount && cursor.getTime() <= untilTime; i++) {
		const date = localDateStr(cursor);
		events.push({ ...base, uid: `${base.uid}:${date}`, startDate: date });
		cursor = addInterval(cursor, freq, interval);
	}
	return events;
}

export function parseIcal(text: string): ICalEvent[] {
	const lines = unfold(text).split('\n');
	const result: ICalEvent[] = [];

	let inEvent = false;
	let props: Record<string, string> = {};
	// Store raw DTSTART line (including param prefix) separately
	let dtLine = '';

	for (const raw of lines) {
		const line = raw.trimEnd();
		if (!line) continue;

		if (line === 'BEGIN:VEVENT') {
			inEvent = true;
			props = {};
			dtLine = '';
			continue;
		}

		if (line === 'END:VEVENT') {
			inEvent = false;

			const uid     = props['UID'];
			const summary = props['SUMMARY'];
			const status  = props['STATUS'] ?? '';
			const rrule   = props['RRULE'];

			if (uid && summary && dtLine && status !== 'CANCELLED') {
				// Get the value part after the (possibly parameterised) property name
				const colonIdx = dtLine.indexOf(':');
				if (colonIdx !== -1) {
					const nameWithParams = dtLine.slice(0, colonIdx).toUpperCase();
					const value = dtLine.slice(colonIdx + 1);
					const parsed = parseDateValue(value);
					if (parsed) {
						result.push(...expandRecurring({
							uid,
							title: unescapeText(summary),
							startDate: parsed.date,
							// Explicit VALUE=DATE param also means all-day
							allDay: parsed.allDay || nameWithParams.includes('VALUE=DATE'),
						}, rrule));
					}
				}
			}
			continue;
		}

		if (!inEvent) continue;

		// Property line: NAME[;PARAM...]:value
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1) continue;

		const propName = line.slice(0, colonIdx).split(';')[0].toUpperCase();
		const value    = line.slice(colonIdx + 1);

		props[propName] = value;
		if (propName === 'DTSTART') dtLine = line;
	}

	return result;
}
