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
 *   20260512T140000Z       → timed (UTC — we just take the date)
 */
function parseDateValue(value: string): { date: string; allDay: boolean } | null {
	const v = value.trim().replace(/Z$/, '');
	if (v.length < 8) return null;
	const date = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
	const allDay = !v.includes('T');
	return { date, allDay };
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

			if (uid && summary && dtLine && status !== 'CANCELLED') {
				// Get the value part after the (possibly parameterised) property name
				const colonIdx = dtLine.indexOf(':');
				if (colonIdx !== -1) {
					const nameWithParams = dtLine.slice(0, colonIdx).toUpperCase();
					const value = dtLine.slice(colonIdx + 1);
					const parsed = parseDateValue(value);
					if (parsed) {
						result.push({
							uid,
							title: unescapeText(summary),
							startDate: parsed.date,
							// Explicit VALUE=DATE param also means all-day
							allDay: parsed.allDay || nameWithParams.includes('VALUE=DATE'),
						});
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
