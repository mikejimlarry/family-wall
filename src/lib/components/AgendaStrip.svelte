<script lang="ts">
	import type { CalendarEvent, Chore, MealPlan, Member } from '$lib/types';
	import { expandRecurring } from '$lib/utils/recurrence';

	type Props = {
		events: CalendarEvent[];
		chores: Chore[];
		meals: MealPlan[];
		members: Member[];
		todayStr: string;
	};

	let { events, chores, meals, members, todayStr }: Props = $props();

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	function addDays(dateStr: string, days: number): string {
		const d = new Date(`${dateStr}T12:00:00`);
		d.setDate(d.getDate() + days);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function dayLabel(dateStr: string, index: number): string {
		if (index === 0) return 'Today';
		if (index === 1) return 'Tmrw';
		const d = new Date(`${dateStr}T12:00:00`);
		return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
	}

	const agendaDays = $derived.by(() => {
		const start = new Date(`${todayStr}T00:00:00`);
		const end = new Date(`${addDays(todayStr, 6)}T23:59:59`);
		const expandedEvents = expandRecurring(events, start, end);
		return Array.from({ length: 7 }, (_, i) => {
			const date = addDays(todayStr, i);
			const dayEvents = expandedEvents
				.filter((event) => event.startDate === date)
				.sort((a, b) => a.title.localeCompare(b.title));
			const dueChores = chores
				.filter((chore) => !chore.completed && !chore.approved && chore.dueDate === date)
				.sort((a, b) => a.sortOrder - b.sortOrder);
			const meal = meals.find((m) => m.date === date);
			return { date, label: dayLabel(date, i), events: dayEvents, chores: dueChores, meal };
		});
	});

	function eventColor(event: CalendarEvent): string {
		if (!event.memberId) return '#94a3b8';
		return memberMap.get(event.memberId)?.color ?? '#60a5fa';
	}
</script>

<div class="flex flex-col gap-2 shrink-0">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">Next 7 Days</h2>
		<span class="text-xs text-slate-600">
			{agendaDays.reduce((n, day) => n + day.events.length + day.chores.length + (day.meal ? 1 : 0), 0)} items
		</span>
	</div>

	<div class="grid grid-cols-7 gap-2">
		{#each agendaDays as day (day.date)}
			<div class="min-w-0 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2">
				<div class="flex items-center justify-between gap-2">
					<p class="text-xs font-semibold text-slate-300">{day.label}</p>
					<span class="text-[10px] text-slate-600 tabular-nums">{new Date(`${day.date}T12:00:00`).getDate()}</span>
				</div>

				<div class="mt-2 flex flex-col gap-1">
					{#each day.events.slice(0, 2) as event (event.id)}
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="h-1.5 w-1.5 rounded-full shrink-0" style="background-color: {eventColor(event)}"></span>
							<span class="truncate text-[11px] text-slate-400">{event.title}</span>
						</div>
					{/each}
					{#each day.chores.slice(0, Math.max(0, 2 - day.events.length)) as chore (chore.id)}
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="text-[10px] text-amber-400 shrink-0">✓</span>
							<span class="truncate text-[11px] text-slate-400">{chore.title}</span>
						</div>
					{/each}
					{#if day.meal && day.events.length + day.chores.length < 2}
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="text-[10px] text-emerald-400 shrink-0">M</span>
							<span class="truncate text-[11px] text-slate-400">{day.meal.meal}</span>
						</div>
					{/if}
					{#if day.events.length + day.chores.length + (day.meal ? 1 : 0) > 2}
						<span class="text-[10px] text-slate-600">+{day.events.length + day.chores.length + (day.meal ? 1 : 0) - 2} more</span>
					{:else if day.events.length === 0 && day.chores.length === 0 && !day.meal}
						<span class="text-[11px] text-slate-700">Clear</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
