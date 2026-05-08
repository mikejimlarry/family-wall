<script lang="ts">
	import type { PageData } from './$types';
	import type { CalendarEvent, Chore, Member } from '$lib/types';
	import type { WeatherData } from '$lib/weather';
	import Clock from '$lib/components/Clock.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import ChoreBoard from '$lib/components/ChoreBoard.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import ChoreModal from '$lib/components/ChoreModal.svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';
	import AdminBar from '$lib/components/AdminBar.svelte';
	import MemberModal from '$lib/components/MemberModal.svelte';

	let { data }: { data: PageData } = $props();

	// Destructure once so $state captures values, not a reactive reference to data
	const { members: initialMembers, events: initialEvents, chores: initialChores, weather: initialWeather } = data;
	let members = $state<Member[]>(initialMembers as Member[]);
	let events = $state<CalendarEvent[]>(initialEvents as CalendarEvent[]);
	let chores = $state<Chore[]>(initialChores as Chore[]);

	let adminMode = $state(false);
	let showEventModal = $state(false);
	let showChoreModal = $state(false);
	let showPeoplePanel = $state(false);
	let editingMember = $state<Member | null>(null);
	let showAddMember = $state(false);
	let eventModalDate = $state<string | undefined>(undefined);

	// --- Admin mode ---
	function unlock() { adminMode = true; }
	function lock()   { adminMode = false; }

	// --- Event handlers ---

	function openAddEvent(date: string) {
		eventModalDate = date;
		showEventModal = true;
	}

	async function saveEvent(payload: {
		title: string;
		startDate: string;
		allDay: boolean;
		memberId: string | null;
	}) {
		const res = await fetch('/api/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
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

	async function saveChore(payload: {
		title: string;
		assignedTo: string | null;
		dueDate: string | null;
		recurrence: string | null;
	}) {
		const res = await fetch('/api/chores', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (res.ok) {
			const chore: Chore = await res.json();
			chores = [...chores, chore];
		}
		showChoreModal = false;
	}

	async function patchChore(id: string, patch: Record<string, unknown>) {
		const res = await fetch(`/api/chores/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (res.ok) {
			const updated: Chore = await res.json();
			chores = chores.map((c) => (c.id === id ? updated : c));
		}
	}

	// Child taps the circle → marks as done (pending approval)
	function markDone(id: string) { patchChore(id, { completed: true }); }

	// Parent approves → chore fully done
	function approveChore(id: string) { patchChore(id, { approved: true }); }

	// Parent rejects → back to todo
	function rejectChore(id: string) { patchChore(id, { rejected: true }); }

	async function deleteChore(id: string) {
		const res = await fetch(`/api/chores/${id}`, { method: 'DELETE' });
		if (res.ok) chores = chores.filter((c) => c.id !== id);
	}

	// --- Member handlers ---

	async function saveMember(payload: { name: string; color: string; emoji: string; birthday: string | null }) {
		if (editingMember) {
			// Edit
			const res = await fetch(`/api/members/${editingMember.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				const updated: Member = await res.json();
				members = members.map((m) => (m.id === updated.id ? updated : m));
			}
			editingMember = null;
		} else {
			// Add
			const res = await fetch('/api/members', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				const added: Member = await res.json();
				members = [...members, added];
			}
			showAddMember = false;
		}
	}

	async function deleteMember(id: string) {
		const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
		if (res.ok) {
			members = members.filter((m) => m.id !== id);
			editingMember = null;
		}
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
				{adminMode}
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
				{adminMode}
				onMarkDone={markDone}
				onApprove={approveChore}
				onReject={rejectChore}
				onDelete={deleteChore}
				onAddChore={() => (showChoreModal = true)}
			/>
		</section>
	</main>
</div>

<!-- Admin bar (floating bottom-right) -->
<AdminBar {adminMode} onUnlock={unlock} onLock={lock} />

<!-- People button (floating bottom-right, above admin bar, only in admin mode) -->
{#if adminMode}
	<button
		onclick={() => (showPeoplePanel = true)}
		class="fixed bottom-20 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm shadow-lg transition-colors"
	>
		👥 People
	</button>
{/if}

<!-- People panel -->
{#if showPeoplePanel}
	<button
		class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
		onclick={() => (showPeoplePanel = false)}
		aria-label="Close"
	></button>
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Manage people"
	>
		<div class="bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Family Members</h2>
				<button onclick={() => (showPeoplePanel = false)} class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
			</div>

			<!-- Member list -->
			<div class="flex flex-col gap-3">
				{#each members as m}
					<button
						onclick={() => { editingMember = m; showPeoplePanel = false; }}
						class="flex items-center gap-3 p-3 rounded-2xl bg-slate-700 hover:bg-slate-600 transition-colors w-full text-left"
					>
						<div
							class="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
							style="background-color: {m.color}30; border: 2px solid {m.color};"
						>{m.emoji ?? '👤'}</div>
						<div class="flex-1 min-w-0">
							<p class="text-white font-medium truncate">{m.name}</p>
							{#if m.birthday}
								<p class="text-slate-400 text-xs">🎂 {m.birthday}</p>
							{/if}
						</div>
						<span class="text-slate-500 text-lg">›</span>
					</button>
				{/each}
			</div>

			<button
				onclick={() => { showAddMember = true; showPeoplePanel = false; }}
				class="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
			>+ Add Member</button>
		</div>
	</div>
{/if}

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

{#if editingMember}
	<MemberModal
		member={editingMember}
		onSave={saveMember}
		onDelete={() => deleteMember(editingMember!.id)}
		onClose={() => (editingMember = null)}
	/>
{/if}

{#if showAddMember}
	<MemberModal
		onSave={saveMember}
		onClose={() => (showAddMember = false)}
	/>
{/if}
