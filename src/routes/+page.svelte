<script lang="ts">
	import type { PageData } from './$types';
	import type { CalendarEvent, Chore, Member } from '$lib/types';
	import Clock from '$lib/components/Clock.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import ChoreBoard from '$lib/components/ChoreBoard.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import ChoreModal from '$lib/components/ChoreModal.svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';
	import type { WeatherData } from '$lib/weather';

	let { data }: { data: PageData } = $props();

	// Destructure once so $state captures values, not a reactive reference to data
	const { members: initialMembers, events: initialEvents, chores: initialChores, weather: initialWeather } = data;
	let members = $state<Member[]>(initialMembers as Member[]);
	let events = $state<CalendarEvent[]>(initialEvents as CalendarEvent[]);
	let chores = $state<Chore[]>(initialChores as Chore[]);

	let showEventModal = $state(false);
	let showChoreModal = $state(false);
	let eventModalDate = $state<string | undefined>(undefined);

	// --- Event handlers ---

	function openAddEvent(date: string) {
		eventModalDate = date;
		showEventModal = true;
	}

	async function saveEvent(data: {
		title: string;
		startDate: string;
		allDay: boolean;
		memberId: string | null;
	}) {
		const res = await fetch('/api/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (res.ok) {
			const event: CalendarEvent = await res.json();
			events = [...events, event];
		}
		showEventModal = false;
	}

	async function deleteEvent(id: string) {
		const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
		if (res.ok) events = events.filter((e) => e.id !== id);
	}

	// --- Chore handlers ---

	async function saveChore(data: {
		title: string;
		assignedTo: string | null;
		dueDate: string | null;
		recurrence: string | null;
	}) {
		const res = await fetch('/api/chores', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		if (res.ok) {
			const chore: Chore = await res.json();
			chores = [...chores, chore];
		}
		showChoreModal = false;
	}

	async function toggleChore(id: string, completed: boolean) {
		const res = await fetch(`/api/chores/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ completed })
		});
		if (res.ok) {
			const updated: Chore = await res.json();
			chores = chores.map((c) => (c.id === id ? updated : c));
		}
	}

	async function deleteChore(id: string) {
		const res = await fetch(`/api/chores/${id}`, { method: 'DELETE' });
		if (res.ok) chores = chores.filter((c) => c.id !== id);
	}
</script>

<div class="min-h-screen bg-slate-900 text-white flex flex-col">
	<!-- Top bar -->
	<header class="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-800">
		<Clock />
		<WeatherWidget initialData={initialWeather as WeatherData | null} />
	</header>

	<!-- Main content: calendar + chores -->
	<main class="flex flex-1 gap-0 overflow-hidden">
		<!-- Calendar: 60% -->
		<section class="flex-[3] p-6 overflow-y-auto">
			<Calendar
				{events}
				{members}
				onAddEvent={openAddEvent}
				onDeleteEvent={deleteEvent}
			/>
		</section>

		<!-- Divider -->
		<div class="w-px bg-slate-800 my-6"></div>

		<!-- Chores: 40% -->
		<section class="flex-[2] p-6 overflow-y-auto">
			<ChoreBoard
				{chores}
				{members}
				onToggle={toggleChore}
				onDelete={deleteChore}
				onAddChore={() => (showChoreModal = true)}
			/>
		</section>
	</main>
</div>

{#if showEventModal}
	<EventModal
		{members}
		initialDate={eventModalDate}
		onSave={saveEvent}
		onClose={() => (showEventModal = false)}
	/>
{/if}

{#if showChoreModal}
	<ChoreModal
		{members}
		onSave={saveChore}
		onClose={() => (showChoreModal = false)}
	/>
{/if}
