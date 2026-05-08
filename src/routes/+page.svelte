<script lang="ts">
	import type { PageData } from './$types';
	import type { CalendarEvent, Chore, GroceryItem, MealPlan, Member } from '$lib/types';
	import type { WeatherData } from '$lib/weather';
	import Clock from '$lib/components/Clock.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import ChoreBoard from '$lib/components/ChoreBoard.svelte';
	import EventModal from '$lib/components/EventModal.svelte';
	import ChoreModal from '$lib/components/ChoreModal.svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';
	import AdminBar from '$lib/components/AdminBar.svelte';
	import MemberModal from '$lib/components/MemberModal.svelte';
	import GroceryList from '$lib/components/GroceryList.svelte';
	import MealPlanPanel from '$lib/components/MealPlan.svelte';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Intentional one-time capture: seed local $state from server load, not kept in sync
	const {
		members: initialMembers,
		events: initialEvents,
		chores: initialChores,
		grocery: initialGrocery,
		meals: initialMeals,
		weather: initialWeather
	} = untrack(() => data);

	let members = $state<Member[]>(initialMembers as Member[]);
	let events  = $state<CalendarEvent[]>(initialEvents as CalendarEvent[]);
	let chores  = $state<Chore[]>(initialChores as Chore[]);
	let grocery = $state<GroceryItem[]>(initialGrocery as GroceryItem[]);
	let meals   = $state<MealPlan[]>(initialMeals as MealPlan[]);

	let adminMode = $state(false);
	let rightTab = $state<'chores' | 'grocery' | 'meals'>('chores');
	let showEventModal = $state(false);
	let showChoreModal = $state(false);
	let editingChore = $state<Chore | null>(null);
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
		if (editingChore) {
			// Edit existing chore
			await patchChore(editingChore.id, payload);
			editingChore = null;
		} else {
			// Add new chore — place it at the end of the list
			const nextSortOrder = chores.length === 0
				? 0
				: Math.max(...chores.map((c) => c.sortOrder)) + 1;
			const res = await fetch('/api/chores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...payload, sortOrder: nextSortOrder })
			});
			if (res.ok) {
				const chore: Chore = await res.json();
				chores = [...chores, chore];
			}
			showChoreModal = false;
		}
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

	function openEditChore(chore: Chore) {
		editingChore = chore;
		showChoreModal = true;
	}

	async function reorderChore(id: string, direction: 'up' | 'down') {
		// Sort only the active (non-completed, non-approved) chores
		const sorted = chores
			.filter((c) => !c.completed && !c.approved)
			.sort((a, b) => a.sortOrder - b.sortOrder);

		const idx = sorted.findIndex((c) => c.id === id);
		if (idx === -1) return;
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= sorted.length) return;

		const a = sorted[idx];
		const b = sorted[swapIdx];

		// If both share the same sortOrder, assign fresh values before swapping
		let aOrder = a.sortOrder;
		let bOrder = b.sortOrder;
		if (aOrder === bOrder) {
			aOrder = idx;
			bOrder = swapIdx;
		}

		// Optimistic update first
		chores = chores.map((c) => {
			if (c.id === a.id) return { ...c, sortOrder: bOrder };
			if (c.id === b.id) return { ...c, sortOrder: aOrder };
			return c;
		});

		await Promise.all([
			patchChore(a.id, { sortOrder: bOrder }),
			patchChore(b.id, { sortOrder: aOrder })
		]);
	}

	// --- Grocery handlers ---

	async function addGroceryItem(name: string) {
		const nextOrder = grocery.length === 0 ? 0 : Math.max(...grocery.map((i) => i.sortOrder)) + 1;
		const res = await fetch('/api/grocery', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, sortOrder: nextOrder })
		});
		if (res.ok) grocery = [...grocery, await res.json()];
	}

	async function checkGroceryItem(id: string, checked: boolean) {
		const res = await fetch(`/api/grocery/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ checked })
		});
		if (res.ok) {
			const updated: GroceryItem = await res.json();
			grocery = grocery.map((i) => (i.id === id ? updated : i));
		}
	}

	async function deleteGroceryItem(id: string) {
		const res = await fetch(`/api/grocery/${id}`, { method: 'DELETE' });
		if (res.ok) grocery = grocery.filter((i) => i.id !== id);
	}

	async function clearCheckedGrocery() {
		const res = await fetch('/api/grocery?checked=true', { method: 'DELETE' });
		if (res.ok) grocery = grocery.filter((i) => !i.checked);
	}

	// --- Meal plan handlers ---

	async function saveMeal(date: string, meal: string, notes: string | null) {
		const res = await fetch(`/api/meals/${date}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ meal, notes })
		});
		if (res.ok) {
			const updated: MealPlan = await res.json();
			meals = [...meals.filter((m) => m.date !== date), updated];
		}
	}

	async function deleteMeal(date: string) {
		const res = await fetch(`/api/meals/${date}`, { method: 'DELETE' });
		if (res.ok) meals = meals.filter((m) => m.date !== date);
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

		<!-- Right panel: tabbed (Chores / Grocery / Meals) -->
		<section class="flex-[2] flex flex-col overflow-hidden">
			<!-- Tab bar -->
			<div class="flex gap-0.5 px-4 pt-4 pb-2 bg-slate-900 shrink-0">
				{#each ([['chores', '✓ Chores'], ['grocery', '🛒 Grocery'], ['meals', '🍽 Meals']] as const) as [tab, label]}
					<button
						onclick={() => (rightTab = tab)}
						class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors {rightTab === tab
							? 'bg-slate-700 text-white'
							: 'text-slate-500 hover:text-slate-300'}"
					>{label}</button>
				{/each}
			</div>

			<!-- Tab content -->
			<div class="flex-1 overflow-hidden px-4 pb-6 pt-2">
				{#if rightTab === 'chores'}
					<ChoreBoard
						{chores}
						{members}
						{adminMode}
						onMarkDone={markDone}
						onApprove={approveChore}
						onReject={rejectChore}
						onDelete={deleteChore}
						onEdit={openEditChore}
						onReorder={reorderChore}
						onAddChore={() => (showChoreModal = true)}
					/>
				{:else if rightTab === 'grocery'}
					<GroceryList
						items={grocery}
						{adminMode}
						onCheck={checkGroceryItem}
						onAdd={addGroceryItem}
						onDelete={deleteGroceryItem}
						onClearChecked={clearCheckedGrocery}
					/>
				{:else if rightTab === 'meals'}
					<MealPlanPanel
						{meals}
						{adminMode}
						onSave={saveMeal}
						onDelete={deleteMeal}
					/>
				{/if}
			</div>
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
		chore={editingChore}
		onSave={saveChore}
		onClose={() => { showChoreModal = false; editingChore = null; }}
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
