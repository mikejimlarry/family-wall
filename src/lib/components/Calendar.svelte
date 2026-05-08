<script lang="ts">
	import type { CalendarEvent, Member } from '$lib/types';

	type CalendarView = 'day' | 'week' | 'month' | 'year';

	type Props = {
		events: CalendarEvent[];
		members: Member[];
		adminMode: boolean;
		onAddEvent: (date: string) => void;
		onDeleteEvent: (id: string) => void;
	};

	let { events, members, adminMode, onAddEvent, onDeleteEvent }: Props = $props();

	const DAYS       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const DAYS_1     = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	const MONTHS_SHT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

	let currentView   = $state<CalendarView>('month');
	let viewDate      = $state(new Date());
	let selectedDate  = $state<string | null>(null);
	let activeMemberId = $state<string | null>(null);

	const year  = $derived(viewDate.getFullYear());
	const month = $derived(viewDate.getMonth());
	const todayStr = new Date().toISOString().split('T')[0];

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));
	const filteredEvents = $derived(
		activeMemberId ? events.filter((e) => e.memberId === activeMemberId) : events
	);

	// ── Navigation ─────────────────────────────────────────────────

	function prev() { viewDate = navigate(-1); selectedDate = null; }
	function next() { viewDate = navigate(1);  selectedDate = null; }

	function navigate(dir: 1 | -1): Date {
		const d = viewDate.getDate();
		switch (currentView) {
			case 'day':   return new Date(year, month, d + dir);
			case 'week':  return new Date(year, month, d + dir * 7);
			case 'month': return new Date(year, month + dir, 1);
			case 'year':  return new Date(year + dir, month, 1);
		}
	}

	function goToday() { viewDate = new Date(); selectedDate = null; }

	function switchView(v: CalendarView) {
		currentView = v;
		selectedDate = null;
	}

	// ── Title ───────────────────────────────────────────────────────

	const viewTitle = $derived.by((): string => {
		switch (currentView) {
			case 'day':
				return viewDate.toLocaleDateString('en-US', {
					weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
				});
			case 'week': {
				const sun = weekStart(viewDate);
				const sat = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 6);
				if (sun.getMonth() === sat.getMonth()) {
					return `${MONTHS_SHT[sun.getMonth()]} ${sun.getDate()} – ${sat.getDate()}, ${sun.getFullYear()}`;
				}
				const sameYear = sun.getFullYear() === sat.getFullYear();
				return sameYear
					? `${MONTHS_SHT[sun.getMonth()]} ${sun.getDate()} – ${MONTHS_SHT[sat.getMonth()]} ${sat.getDate()}, ${sun.getFullYear()}`
					: `${MONTHS_SHT[sun.getMonth()]} ${sun.getDate()}, ${sun.getFullYear()} – ${MONTHS_SHT[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`;
			}
			case 'month': return `${MONTHS[month]} ${year}`;
			case 'year':  return `${year}`;
		}
	});

	// ── Helpers ──────────────────────────────────────────────────────

	function toDateStr(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function eventsForDate(dateStr: string): CalendarEvent[] {
		return filteredEvents.filter((e) => e.startDate === dateStr);
	}

	function eventColor(event: CalendarEvent): string {
		if (event.memberId) return memberMap.get(event.memberId)?.color ?? '#60a5fa';
		return '#94a3b8';
	}

	// ── Month grid ────────────────────────────────────────────────

	function buildMonthGrid(y: number, m: number) {
		const firstDow   = new Date(y, m, 1).getDay();
		const daysInMonth = new Date(y, m + 1, 0).getDate();
		const daysInPrev  = new Date(y, m, 0).getDate();
		const cells: { date: Date; dateStr: string; current: boolean }[] = [];

		for (let i = firstDow - 1; i >= 0; i--) {
			const d = new Date(y, m - 1, daysInPrev - i);
			cells.push({ date: d, dateStr: toDateStr(d), current: false });
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(y, m, d);
			cells.push({ date, dateStr: toDateStr(date), current: true });
		}
		const remaining = 42 - cells.length;
		for (let d = 1; d <= remaining; d++) {
			const date = new Date(y, m + 1, d);
			cells.push({ date, dateStr: toDateStr(date), current: false });
		}
		return cells;
	}

	const calendarDays = $derived(buildMonthGrid(year, month));

	// ── Week grid ─────────────────────────────────────────────────

	function weekStart(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
	}

	const weekDays = $derived.by(() => {
		const sun = weekStart(viewDate);
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + i);
			return { date: d, dateStr: toDateStr(d) };
		});
	});

	// ── Year grid ─────────────────────────────────────────────────

	const yearMonths = $derived(
		Array.from({ length: 12 }, (_, m) => ({
			month: m,
			name: MONTHS_SHT[m],
			grid: buildMonthGrid(year, m)
		}))
	);

	// ── Day view ──────────────────────────────────────────────────

	const dayStr    = $derived(toDateStr(viewDate));
	const dayEvents = $derived(eventsForDate(dayStr));

	// ── Month / Week selected day panel ───────────────────────────

	const selectedEvents = $derived(selectedDate ? eventsForDate(selectedDate) : []);

	function selectDate(dateStr: string) {
		selectedDate = selectedDate === dateStr ? null : dateStr;
	}

	function goToMonth(m: number) {
		viewDate = new Date(year, m, 1);
		currentView = 'month';
		selectedDate = null;
	}
</script>

<div class="flex flex-col h-full gap-2">

	<!-- ── Header ───────────────────────────────────────────────── -->
	<div class="flex items-center gap-2 flex-wrap">
		<!-- Navigation -->
		<button
			onclick={prev}
			class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-lg leading-none"
		>‹</button>

		<h2 class="text-base font-semibold text-white min-w-[160px] text-center">
			{viewTitle}
		</h2>

		<button
			onclick={next}
			class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-lg leading-none"
		>›</button>

		<button
			onclick={goToday}
			class="text-xs px-2.5 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors ml-1"
		>Today</button>

		<!-- View tabs -->
		<div class="flex gap-0.5 bg-slate-800 rounded-full p-0.5 ml-2">
			{#each (['day', 'week', 'month', 'year'] as const) as v}
				<button
					onclick={() => switchView(v)}
					class="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors {currentView === v
						? 'bg-slate-600 text-white'
						: 'text-slate-500 hover:text-slate-300'}"
				>{v}</button>
			{/each}
		</div>

		<!-- Member filter -->
		<div class="flex items-center gap-1.5 ml-auto flex-wrap">
			<button
				onclick={() => (activeMemberId = null)}
				class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors {activeMemberId === null
					? 'bg-slate-500 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>All</button>
			{#each members as member (member.id)}
				<button
					onclick={() => (activeMemberId = activeMemberId === member.id ? null : member.id)}
					class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
					style="background-color: {activeMemberId === member.id ? member.color : 'transparent'}; color: {activeMemberId === member.id ? '#fff' : member.color}; border: 1px solid {member.color};"
				>{member.name}</button>
			{/each}
		</div>
	</div>

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- MONTH VIEW                                                 -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{#if currentView === 'month'}

		<!-- Day-of-week header -->
		<div class="grid grid-cols-7 text-center">
			{#each DAYS as day}
				<div class="text-xs font-medium text-slate-500 py-0.5">{day}</div>
			{/each}
		</div>

		<!-- Calendar grid -->
		<div class="grid grid-cols-7 gap-px bg-slate-700/30 rounded-xl overflow-hidden flex-1">
			{#each calendarDays as cell (cell.dateStr)}
				{@const dayEvts = eventsForDate(cell.dateStr)}
				{@const isToday    = cell.dateStr === todayStr}
				{@const isSelected = cell.dateStr === selectedDate}
				<button
					onclick={() => selectDate(cell.dateStr)}
					class="bg-slate-900 p-1 flex flex-col gap-0.5 min-h-[4.5rem] text-left transition-colors hover:bg-slate-800 {isSelected ? 'ring-1 ring-inset ring-blue-500' : ''}"
				>
					<span class="text-xs w-5 h-5 flex items-center justify-center rounded-full leading-none shrink-0 {isToday
						? 'bg-blue-500 text-white font-semibold'
						: cell.current ? 'text-slate-200' : 'text-slate-600'}">
						{cell.date.getDate()}
					</span>
					<div class="flex flex-col gap-0.5 w-full overflow-hidden">
						{#each dayEvts.slice(0, 2) as event (event.id)}
							<span
								class="block text-[10px] px-1 py-px rounded truncate leading-tight"
								style="background-color: {eventColor(event)}28; color: {eventColor(event)}"
							>{event.title}</span>
						{/each}
						{#if dayEvts.length > 2}
							<span class="text-[9px] text-slate-500 px-0.5">+{dayEvts.length - 2}</span>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Selected day panel -->
		{#if selectedDate}
			<div class="bg-slate-800 rounded-xl p-3 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-slate-300">
						{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
							weekday: 'long', month: 'long', day: 'numeric'
						})}
					</span>
					{#if adminMode}
						<button
							onclick={() => onAddEvent(selectedDate!)}
							class="text-xs px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
						>+ Add event</button>
					{/if}
				</div>
				{#if selectedEvents.length === 0}
					<p class="text-xs text-slate-500">No events.</p>
				{/if}
				{#each selectedEvents as event (event.id)}
					<div class="flex items-center gap-2 group">
						<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {eventColor(event)}"></span>
						<span class="text-sm text-slate-200 flex-1">{event.title}</span>
						{#if event.memberId}
							<span class="text-xs px-1.5 py-0.5 rounded-full"
								style="background-color: {memberMap.get(event.memberId)?.color}22; color: {memberMap.get(event.memberId)?.color}">
								{memberMap.get(event.memberId)?.name}
							</span>
						{/if}
						{#if adminMode && event.source !== 'birthday'}
							<button onclick={() => onDeleteEvent(event.id)}
								class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs transition-opacity">✕</button>
						{/if}
					</div>
				{/each}
			</div>
		{:else if adminMode}
			<button onclick={() => onAddEvent(todayStr)}
				class="text-sm text-slate-500 hover:text-slate-300 transition-colors text-left px-1">
				+ Add event to today
			</button>
		{/if}

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- WEEK VIEW                                                  -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{:else if currentView === 'week'}

		<div class="grid grid-cols-7 gap-px bg-slate-700/30 rounded-xl overflow-hidden flex-1 min-h-0">
			{#each weekDays as { date, dateStr } (dateStr)}
				{@const isToday = dateStr === todayStr}
				{@const dayEvts = eventsForDate(dateStr)}
				<div class="bg-slate-900 flex flex-col min-h-0">
					<!-- Day column header — click to go to day view -->
					<button
						onclick={() => { viewDate = date; currentView = 'day'; }}
						class="flex flex-col items-center py-2 border-b border-slate-800 hover:bg-slate-800 transition-colors shrink-0 {isToday ? 'bg-blue-900/20' : ''}"
					>
						<span class="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
							{DAYS[date.getDay()].slice(0, 3)}
						</span>
						<span class="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mt-0.5 {isToday
							? 'bg-blue-500 text-white'
							: 'text-slate-200'}">
							{date.getDate()}
						</span>
					</button>

					<!-- Events -->
					<div class="flex flex-col gap-1 p-1 overflow-y-auto flex-1">
						{#each dayEvts as event (event.id)}
							<div class="group relative">
								<span
									class="block text-[10px] px-1.5 py-1 rounded leading-tight break-words"
									style="background-color: {eventColor(event)}28; color: {eventColor(event)}"
								>{event.title}</span>
								{#if adminMode && event.source !== 'birthday'}
									<button
										onclick={() => onDeleteEvent(event.id)}
										class="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-[9px] text-slate-500 hover:text-red-400 transition-opacity leading-none"
									>✕</button>
								{/if}
							</div>
						{/each}

						{#if adminMode}
							<button
								onclick={() => onAddEvent(dateStr)}
								class="text-[10px] text-slate-700 hover:text-slate-400 transition-colors mt-auto pt-1 text-center"
							>+</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- DAY VIEW                                                   -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{:else if currentView === 'day'}

		<div class="flex flex-col gap-2 flex-1 overflow-y-auto">
			{#if dayEvents.length === 0}
				<div class="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-3">
					<span>No events this day</span>
					{#if adminMode}
						<button
							onclick={() => onAddEvent(dayStr)}
							class="text-xs px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
						>+ Add event</button>
					{/if}
				</div>
			{:else}
				{#each dayEvents as event (event.id)}
					<div
						class="group flex items-start gap-3 p-3 rounded-xl"
						style="background-color: {eventColor(event)}18; border-left: 3px solid {eventColor(event)}"
					>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium" style="color: {eventColor(event)}">{event.title}</p>
							{#if event.memberId}
								<p class="text-xs text-slate-400 mt-0.5">{memberMap.get(event.memberId)?.name}</p>
							{/if}
						</div>
						{#if adminMode && event.source !== 'birthday'}
							<button
								onclick={() => onDeleteEvent(event.id)}
								class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs transition-opacity shrink-0 mt-0.5"
							>✕</button>
						{/if}
					</div>
				{/each}

				{#if adminMode}
					<button
						onclick={() => onAddEvent(dayStr)}
						class="text-sm text-slate-500 hover:text-slate-300 transition-colors text-left px-1 mt-1"
					>+ Add event</button>
				{/if}
			{/if}
		</div>

	<!-- ══════════════════════════════════════════════════════════ -->
	<!-- YEAR VIEW                                                  -->
	<!-- ══════════════════════════════════════════════════════════ -->
	{:else if currentView === 'year'}

		<div class="grid grid-cols-4 gap-3 flex-1 overflow-y-auto content-start">
			{#each yearMonths as { month: m, name, grid } (m)}
				{@const monthEvts = grid
					.filter((c) => c.current)
					.flatMap((c) => eventsForDate(c.dateStr))
					.slice(0, 6)}
				<button
					onclick={() => goToMonth(m)}
					class="bg-slate-800/60 hover:bg-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5 transition-colors text-left"
				>
					<!-- Month name -->
					<span class="text-xs font-semibold text-slate-300">{name}</span>

					<!-- Day letter headers -->
					<div class="grid grid-cols-7">
						{#each DAYS_1 as h}
							<span class="text-[8px] text-slate-600 text-center leading-none">{h}</span>
						{/each}
					</div>

					<!-- Days grid -->
					<div class="grid grid-cols-7 gap-y-px">
						{#each grid as cell (cell.dateStr)}
							{@const evts = eventsForDate(cell.dateStr)}
							{@const isToday = cell.dateStr === todayStr}
							<div class="flex items-center justify-center py-px">
								<span class="w-4 h-4 flex items-center justify-center text-[9px] rounded-full leading-none {
									isToday            ? 'bg-blue-500 text-white font-bold' :
									evts.length > 0 && cell.current ? 'bg-slate-600 text-white' :
									cell.current       ? 'text-slate-500' :
									                     'text-slate-700'
								}">
									{cell.date.getDate()}
								</span>
							</div>
						{/each}
					</div>

					<!-- Event color dots for the month -->
					{#if monthEvts.length > 0}
						<div class="flex gap-0.5 flex-wrap mt-0.5">
							{#each monthEvts as event (event.id)}
								<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: {eventColor(event)}"></span>
							{/each}
						</div>
					{/if}
				</button>
			{/each}
		</div>

	{/if}
</div>
