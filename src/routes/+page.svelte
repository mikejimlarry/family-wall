<script lang="ts">
	import type { PageData } from './$types';
	import type { CalendarEvent, Chore, GroceryItem, MealPlan, Member, Message, CalendarFeed, Routine, RoutineCompletion, RoutinePeriod } from '$lib/types';
	import type { WeatherData } from '$lib/weather';
	import { onMount, untrack } from 'svelte';
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
	import MessageBoard from '$lib/components/MessageBoard.svelte';
	import SleepOverlay from '$lib/components/SleepOverlay.svelte';
	import CalFeedManager from '$lib/components/CalFeedManager.svelte';
	import RoutineBoard from '$lib/components/RoutineBoard.svelte';
	import ThemeSettings from '$lib/components/ThemeSettings.svelte';
	import { resolveTheme, parseThemeSettings, DEFAULT_SCHEDULE } from '$lib/utils/theme';
	import type { ThemeMode, AutoType, WeekSchedule } from '$lib/utils/theme';

	let { data }: { data: PageData } = $props();

	// Intentional one-time capture: seed local $state from server load, not kept in sync
	const {
		members: initialMembers,
		events: initialEvents,
		chores: initialChores,
		grocery: initialGrocery,
		meals: initialMeals,
		messages: initialMessages,
		feeds: initialFeeds,
		routines: initialRoutines,
		completions: initialCompletions,
		todayStr: initialTodayStr,
		themeSettings: initialThemeSettings,
		weather: initialWeather
	} = untrack(() => data);

	let members     = $state<Member[]>(initialMembers as Member[]);
	let events      = $state<CalendarEvent[]>(initialEvents as CalendarEvent[]);
	let chores      = $state<Chore[]>(initialChores as Chore[]);
	let grocery     = $state<GroceryItem[]>(initialGrocery as GroceryItem[]);
	let meals       = $state<MealPlan[]>(initialMeals as MealPlan[]);
	let messages    = $state<Message[]>(initialMessages as Message[]);
	let feeds       = $state<CalendarFeed[]>(initialFeeds as CalendarFeed[]);
	let routines    = $state<Routine[]>(initialRoutines as Routine[]);
	let completions = $state<RoutineCompletion[]>(initialCompletions as RoutineCompletion[]);
	const todayStr  = initialTodayStr as string;

	// ─── Theme ────────────────────────────────────────────────────────────────
	const _rawTheme = untrack(() => initialThemeSettings) as Record<string, string> ?? {};
	const _parsedTheme = parseThemeSettings(_rawTheme);

	let themeMode     = $state<ThemeMode>(_parsedTheme.mode);
	let themeAutoType = $state<AutoType>(_parsedTheme.autoType);
	let themeSchedule = $state<WeekSchedule>(_parsedTheme.schedule);
	let themeLat      = $state<number | null>(_parsedTheme.lat);
	let themeLon      = $state<number | null>(_parsedTheme.lon);
	let showThemeSettings = $state(false);

	// Reactive theme resolution (re-runs whenever mode/schedule/time changes)
	const activeTheme = $derived(resolveTheme(
		{ mode: themeMode, autoType: themeAutoType, schedule: themeSchedule, lat: themeLat, lon: themeLon },
		new Date()
	));

	// Apply theme class to <html> and re-check every minute for auto mode
	$effect(() => {
		const apply = () => {
			const t = resolveTheme(
				{ mode: themeMode, autoType: themeAutoType, schedule: themeSchedule, lat: themeLat, lon: themeLon },
			);
			document.documentElement.classList.toggle('light', t === 'light');
		};
		apply();
		const id = setInterval(apply, 60_000);
		return () => clearInterval(id);
	});

	async function saveThemeSettings(mode: ThemeMode, autoType: AutoType, schedule: WeekSchedule) {
		themeMode     = mode;
		themeAutoType = autoType;
		themeSchedule = schedule;
		await fetch('/api/settings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				'theme.mode':      mode,
				'theme.auto_type': autoType,
				'theme.schedule':  JSON.stringify(schedule),
			}),
		});
	}
	// ──────────────────────────────────────────────────────────────────────────

	let adminMode  = $state(false);
	let viewingAs  = $state<string | null>(null);
	let rightTab   = $state<'chores' | 'grocery' | 'meals' | 'notes' | 'routines'>('chores');
	let showEventModal = $state(false);
	let showChoreModal = $state(false);
	let editingChore = $state<Chore | null>(null);
	let showPeoplePanel = $state(false);
	let editingMember = $state<Member | null>(null);
	let showAddMember = $state(false);
	let eventModalDate = $state<string | undefined>(undefined);
	let showFeedManager = $state(false);

	// --- Sleep mode ---
	const SLEEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
	let sleeping = $state(false);
	let lastActivity = $state(Date.now());

	onMount(() => {
		const id = setInterval(() => {
			if (!sleeping && Date.now() - lastActivity > SLEEP_TIMEOUT_MS) {
				sleep();
			}
		}, 10_000);
		return () => clearInterval(id);
	});

	function sleep() { sleeping = true; adminMode = false; }
	function recordActivity() { lastActivity = Date.now(); }
	function wake() { sleeping = false; lastActivity = Date.now(); }

	// --- Countdown strip ---

	function localDateStr(d: Date): string {
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${mo}-${day}`;
	}

	const upcomingCountdowns = $derived.by(() => {
		const today = new Date(todayStr + 'T00:00:00');
		const cutoff = new Date(todayStr + 'T00:00:00');
		cutoff.setDate(cutoff.getDate() + 60);
		const cutoffStr = localDateStr(cutoff);

		return events
			.filter(e => e.startDate > todayStr && e.startDate <= cutoffStr)
			.sort((a, b) => a.startDate.localeCompare(b.startDate))
			.slice(0, 8)
			.map(e => {
				const diff = Math.round(
					(new Date(e.startDate + 'T00:00:00').getTime() - today.getTime()) / 86400000
				);
				return { event: e, days: diff };
			});
	});

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
		endDate: string | null;
		allDay: boolean;
		memberId: string | null;
		recurrenceRule: string | null;
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
		assignedTo: string[];
		dueDate: string | null;
		recurrence: string | null;
		points: number;
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

	async function patchChore(id: string, patch: Record<string, unknown>): Promise<void> {
		const res = await fetch(`/api/chores/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (res.ok) {
			const updated: Chore = await res.json();
			chores = chores.map((c) => (c.id === id ? updated : c));
			// If this was an approval, refresh member points
			if ('approved' in patch && patch.approved) {
				const mRes = await fetch('/api/members');
				if (mRes.ok) members = await mRes.json();
			}
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

	// --- Message board handlers ---

	async function addMessage(text: string, authorId: string | null, authorName: string | null) {
		const res = await fetch('/api/messages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text, authorId, authorName })
		});
		if (res.ok) {
			const msg: Message = await res.json();
			messages = [msg, ...messages];
		}
	}

	async function deleteMessage(id: string) {
		const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
		if (res.ok) messages = messages.filter((m) => m.id !== id);
	}

	async function togglePinMessage(id: string, pinned: boolean) {
		const res = await fetch(`/api/messages/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pinned })
		});
		if (res.ok) {
			const updated: Message = await res.json();
			messages = messages.map((m) => (m.id === id ? updated : m));
		}
	}

	// --- Routine handlers ---

	async function toggleRoutine(routineId: string, memberId: string | null, done: boolean) {
		if (done) {
			const res = await fetch(`/api/routines/${routineId}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: todayStr, memberId })
			});
			if (res.ok) {
				const row: RoutineCompletion = await res.json();
				completions = [...completions.filter(c => !(c.routineId === routineId && c.memberId === memberId)), row];
			}
		} else {
			const res = await fetch(`/api/routines/${routineId}/complete`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: todayStr, memberId })
			});
			if (res.ok) {
				completions = completions.filter(c => !(c.routineId === routineId && c.memberId === memberId));
			}
		}
	}

	async function addRoutine(title: string, memberId: string | null, period: RoutinePeriod) {
		const periodRoutines = routines.filter(r => r.period === period);
		const nextSortOrder = periodRoutines.length === 0
			? 0
			: Math.max(...periodRoutines.map(r => r.sortOrder)) + 1;
		const res = await fetch('/api/routines', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title, memberId, period, sortOrder: nextSortOrder })
		});
		if (res.ok) {
			const routine: Routine = await res.json();
			routines = [...routines, routine];
		}
	}

	async function deleteRoutine(id: string) {
		const res = await fetch(`/api/routines/${id}`, { method: 'DELETE' });
		if (res.ok) routines = routines.filter(r => r.id !== id);
	}

	async function reorderRoutine(id: string, direction: 'up' | 'down') {
		const routine = routines.find(r => r.id === id);
		if (!routine) return;
		const periodList = routines
			.filter(r => r.period === routine.period)
			.sort((a, b) => a.sortOrder - b.sortOrder);
		const idx = periodList.findIndex(r => r.id === id);
		if (idx === -1) return;
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= periodList.length) return;

		const a = periodList[idx];
		const b = periodList[swapIdx];
		let aOrder = a.sortOrder;
		let bOrder = b.sortOrder;
		if (aOrder === bOrder) { aOrder = idx; bOrder = swapIdx; }

		routines = routines.map(r => {
			if (r.id === a.id) return { ...r, sortOrder: bOrder };
			if (r.id === b.id) return { ...r, sortOrder: aOrder };
			return r;
		});

		await Promise.all([
			fetch(`/api/routines/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: bOrder }) }),
			fetch(`/api/routines/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: aOrder }) })
		]);
	}

	// --- Member handlers ---

	async function saveMember(payload: { name: string; color: string; emoji: string; birthday: string | null; role: string }) {
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

<!-- Record any interaction to reset the sleep timer -->
<svelte:document onmousemove={recordActivity} ontouchstart={recordActivity} onkeydown={recordActivity} />

<div class="min-h-screen bg-slate-900 text-white flex flex-col">
	<!-- Top bar -->
	<header class="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-800">
		<Clock />
		<WeatherWidget initialData={initialWeather as WeatherData | null} />
	</header>

	<!-- Countdown strip -->
	{#if upcomingCountdowns.length > 0}
		<div class="flex items-center gap-3 px-8 py-2 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
			{#each upcomingCountdowns as { event, days } (event.id)}
				<span class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-sm shrink-0 whitespace-nowrap">
					<span class="font-medium text-slate-200 truncate max-w-[160px]">{event.title}</span>
					<span class="text-slate-500">·</span>
					<span class="font-semibold tabular-nums {days <= 3 ? 'text-amber-400' : days <= 7 ? 'text-blue-400' : 'text-slate-400'}">
						{days === 1 ? 'tomorrow' : `in ${days}d`}
					</span>
				</span>
			{/each}
		</div>
	{/if}

	<!-- Who's viewing selector -->
	{#if members.length > 0}
		<div class="flex items-center gap-2 px-6 py-2 border-b border-slate-800/60 bg-slate-900/80">
			<span class="text-xs text-slate-500 shrink-0 font-medium">Who's here?</span>
			<div class="flex flex-wrap gap-1.5">
				<button
					onclick={() => (viewingAs = null)}
					class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors {viewingAs === null
						? 'bg-slate-600 text-white'
						: 'text-slate-500 hover:text-slate-300'}"
				>Everyone</button>
				{#each members as m (m.id)}
					<button
						onclick={() => (viewingAs = viewingAs === m.id ? null : m.id)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
						style="background-color: {viewingAs === m.id ? m.color : 'transparent'}20;
						       color: {viewingAs === m.id ? m.color : '#64748b'};
						       border: 1.5px solid {viewingAs === m.id ? m.color : '#334155'};"
					>
						<span>{m.emoji ?? '👤'}</span>
						<span>{m.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Main content: calendar + right panel -->
	<main class="flex flex-1 gap-0 overflow-hidden">
		<!-- Calendar: 60% -->
		<section class="flex-[3] p-6 overflow-y-auto">
			<Calendar
				{events}
				{members}
				{feeds}
				{adminMode}
				onAddEvent={openAddEvent}
				onDeleteEvent={deleteEvent}
			/>
		</section>

		<!-- Divider -->
		<div class="w-px bg-slate-600 my-6"></div>

		<!-- Right panel: tabbed (Chores / Grocery / Meals / Notes) -->
		<section class="flex-[2] flex flex-col overflow-hidden">
			<!-- Tab bar -->
			<div class="flex gap-1 px-4 pt-4 pb-2 bg-slate-900 shrink-0">
				{#each ([['chores', '✓ Chores'], ['grocery', '🛒 Grocery'], ['meals', '🍽 Meals'], ['notes', '📝 Notes'], ['routines', '☀️ Routines']] as const) as [tab, label]}
					<button
						onclick={() => (rightTab = tab)}
						class="flex-1 py-3 rounded-xl text-xs font-medium transition-colors {rightTab === tab
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
						{viewingAs}
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
				{:else if rightTab === 'notes'}
					<MessageBoard
						{messages}
						{members}
						{adminMode}
						onAdd={(text, authorId, authorName) => addMessage(text, authorId, authorName)}
						onDelete={deleteMessage}
						onTogglePin={togglePinMessage}
					/>
				{:else if rightTab === 'routines'}
					<RoutineBoard
						{routines}
						{completions}
						{members}
						{adminMode}
						{todayStr}
						{viewingAs}
						onToggle={toggleRoutine}
						onAdd={addRoutine}
						onDelete={deleteRoutine}
						onReorder={reorderRoutine}
					/>
				{/if}
			</div>
		</section>
	</main>
</div>

<!-- Sleep overlay -->
{#if sleeping}
	<SleepOverlay onWake={wake} />
{/if}

<!-- Sleep button (floating bottom-center) -->
<button
	onclick={sleep}
	class="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors text-xl"
	aria-label="Sleep"
	title="Sleep"
>🌙</button>

<!-- Admin bar (floating bottom-right) -->
<AdminBar {adminMode} onUnlock={unlock} onLock={lock} />

<!-- People button (floating bottom-right, above admin bar, only in admin mode) -->
{#if adminMode}
	<div class="fixed bottom-20 right-6 z-30 flex flex-col gap-2 items-end">
		<button
			onclick={() => (showThemeSettings = true)}
			class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm shadow-lg transition-colors"
		>
			{activeTheme === 'light' ? '☀️' : '🌙'} Theme
		</button>
		<button
			onclick={() => (showFeedManager = true)}
			class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm shadow-lg transition-colors"
		>
			📅 Calendars
		</button>
		<button
			onclick={() => (showPeoplePanel = true)}
			class="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm shadow-lg transition-colors"
		>
			👥 People
		</button>
	</div>
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

			<!-- Member list with points -->
			<div class="flex flex-col gap-3">
				{#each members.slice().sort((a, b) => b.pointsEarned - a.pointsEarned) as m}
					<button
						onclick={() => { editingMember = m; showPeoplePanel = false; }}
						class="flex items-center gap-3 p-3 rounded-2xl bg-slate-700 hover:bg-slate-600 transition-colors w-full text-left"
					>
						<div
							class="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
							style="background-color: {m.color}30; border: 2px solid {m.color};"
						>{m.emoji ?? '👤'}</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<p class="text-white font-medium truncate">{m.name}</p>
								<span class="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 {
									m.role === 'parent' ? 'bg-amber-500/20 text-amber-400' :
									m.role === 'guest'  ? 'bg-slate-600/50 text-slate-400' :
									                      'bg-blue-500/20 text-blue-400'
								}">
									{ m.role === 'parent' ? '👑 Parent' : m.role === 'guest' ? '👋 Guest' : '⭐ Child' }
								</span>
							</div>
							{#if m.birthday}
								<p class="text-slate-400 text-xs">🎂 {m.birthday}</p>
							{/if}
						</div>
						{#if m.pointsEarned > 0}
							<span class="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
								⭐ {m.pointsEarned}
							</span>
						{/if}
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

{#if showThemeSettings}
	<ThemeSettings
		initialMode={themeMode}
		initialAutoType={themeAutoType}
		initialSchedule={themeSchedule}
		hasLocation={themeLat != null}
		onSave={saveThemeSettings}
		onClose={() => (showThemeSettings = false)}
	/>
{/if}

{#if showFeedManager}
	<CalFeedManager
		{feeds}
		onClose={() => (showFeedManager = false)}
		onFeedsChange={(updated) => (feeds = updated)}
		onEventsRefresh={(feedId, newEvents) => {
			// Replace ical events from this feed with the freshly synced set
			events = [
				...events.filter(e => !(e.source === 'ical' && e.externalId?.startsWith(feedId + ':'))),
				...newEvents
			];
		}}
	/>
{/if}
