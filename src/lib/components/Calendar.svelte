<script lang="ts">
	import type { CalendarEvent, Member } from '$lib/types';

	type Props = {
		events: CalendarEvent[];
		members: Member[];
		adminMode: boolean;
		onAddEvent: (date: string) => void;
		onDeleteEvent: (id: string) => void;
	};

	let { events, members, adminMode, onAddEvent, onDeleteEvent }: Props = $props();

	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	let viewDate = $state(new Date());
	let selectedDate = $state<string | null>(null);
	let activeMemberId = $state<string | null>(null);

	const year = $derived(viewDate.getFullYear());
	const month = $derived(viewDate.getMonth());

	const todayStr = new Date().toISOString().split('T')[0];

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	const filteredEvents = $derived(
		activeMemberId ? events.filter((e) => e.memberId === activeMemberId) : events
	);

	const calendarDays = $derived(buildGrid(year, month));

	function buildGrid(y: number, m: number) {
		const firstDow = new Date(y, m, 1).getDay();
		const daysInMonth = new Date(y, m + 1, 0).getDate();
		const daysInPrev = new Date(y, m, 0).getDate();
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

	function toDateStr(d: Date) {
		return d.toISOString().split('T')[0];
	}

	function eventsForDate(dateStr: string) {
		return filteredEvents.filter((e) => e.startDate === dateStr);
	}

	function eventColor(event: CalendarEvent) {
		if (event.memberId) return memberMap.get(event.memberId)?.color ?? '#60a5fa';
		return '#94a3b8';
	}

	function prevMonth() {
		viewDate = new Date(year, month - 1, 1);
		selectedDate = null;
	}

	function nextMonth() {
		viewDate = new Date(year, month + 1, 1);
		selectedDate = null;
	}

	function selectDate(dateStr: string) {
		selectedDate = selectedDate === dateStr ? null : dateStr;
	}

	const selectedEvents = $derived(selectedDate ? eventsForDate(selectedDate) : []);
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header row -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button
				onclick={prevMonth}
				class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
			>
				‹
			</button>
			<h2 class="text-xl font-semibold text-white w-44 text-center">
				{MONTHS[month]} {year}
			</h2>
			<button
				onclick={nextMonth}
				class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
			>
				›
			</button>
		</div>

		<!-- Member filter chips -->
		<div class="flex items-center gap-2">
			<button
				onclick={() => (activeMemberId = null)}
				class="px-3 py-1 rounded-full text-xs font-medium transition-colors {activeMemberId === null
					? 'bg-slate-500 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				All
			</button>
			{#each members as member (member.id)}
				<button
					onclick={() => (activeMemberId = activeMemberId === member.id ? null : member.id)}
					class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
					style="background-color: {activeMemberId === member.id
						? member.color
						: 'transparent'}; color: {activeMemberId === member.id
						? '#fff'
						: member.color}; border: 1px solid {member.color};"
				>
					{member.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Day-of-week header -->
	<div class="grid grid-cols-7 text-center">
		{#each DAYS as day}
			<div class="text-xs font-medium text-slate-500 py-1">{day}</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid grid-cols-7 gap-px bg-slate-700/30 rounded-xl overflow-hidden flex-1">
		{#each calendarDays as cell (cell.dateStr)}
			{@const dayEvents = eventsForDate(cell.dateStr)}
			{@const isToday = cell.dateStr === todayStr}
			{@const isSelected = cell.dateStr === selectedDate}
			<button
				onclick={() => selectDate(cell.dateStr)}
				class="bg-slate-900 p-1.5 flex flex-col gap-1 min-h-16 text-left transition-colors hover:bg-slate-800 {isSelected
					? 'ring-1 ring-inset ring-blue-500'
					: ''}"
			>
				<span
					class="text-sm w-6 h-6 flex items-center justify-center rounded-full leading-none {isToday
						? 'bg-blue-500 text-white font-semibold'
						: cell.current
							? 'text-slate-200'
							: 'text-slate-600'}"
				>
					{cell.date.getDate()}
				</span>
				<div class="flex flex-wrap gap-0.5">
					{#each dayEvents.slice(0, 3) as event (event.id)}
						<span
							class="w-1.5 h-1.5 rounded-full"
							style="background-color: {eventColor(event)}"
						></span>
					{/each}
					{#if dayEvents.length > 3}
						<span class="text-[9px] text-slate-500">+{dayEvents.length - 3}</span>
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
						weekday: 'long',
						month: 'long',
						day: 'numeric'
					})}
				</span>
				{#if adminMode}
					<button
						onclick={() => onAddEvent(selectedDate!)}
						class="text-xs px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
					>
						+ Add event
					</button>
				{/if}
			</div>
			{#if selectedEvents.length === 0}
				<p class="text-xs text-slate-500">No events — tap to add one.</p>
			{/if}
			{#each selectedEvents as event (event.id)}
				<div class="flex items-center gap-2 group">
					<span
						class="w-2 h-2 rounded-full shrink-0"
						style="background-color: {eventColor(event)}"
					></span>
					<span class="text-sm text-slate-200 flex-1">{event.title}</span>
					{#if !event.allDay && event.startDate}
						<span class="text-xs text-slate-500">
							{new Date(event.startDate).toLocaleTimeString('en-US', {
								hour: 'numeric',
								minute: '2-digit'
							})}
						</span>
					{/if}
					{#if event.memberId}
						<span
							class="text-xs px-1.5 py-0.5 rounded-full"
							style="background-color: {memberMap.get(event.memberId)?.color}22; color: {memberMap.get(event.memberId)?.color}"
						>
							{memberMap.get(event.memberId)?.name}
						</span>
					{/if}
					{#if adminMode}
						<button
							onclick={() => onDeleteEvent(event.id)}
							class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs transition-opacity"
						>
							✕
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{:else if adminMode}
		<button
			onclick={() => onAddEvent(todayStr)}
			class="text-sm text-slate-500 hover:text-slate-300 transition-colors text-left px-1"
		>
			+ Add event to today
		</button>
	{/if}
</div>
