<script lang="ts">
	import { untrack } from 'svelte';
	import type { Routine, RoutineCompletion, RoutinePeriod, Member } from '$lib/types';

	type Props = {
		routines: Routine[];
		completions: RoutineCompletion[]; // today's completions only
		members: Member[];
		adminMode: boolean;
		todayStr: string; // YYYY-MM-DD local date
		viewingAs?: string | null;
		onToggle:  (routineId: string, memberId: string | null, done: boolean) => void;
		onAdd:     (title: string, memberId: string | null, period: RoutinePeriod) => void;
		onDelete:  (id: string) => void;
		onReorder: (id: string, direction: 'up' | 'down') => void;
	};

	let { routines, completions, members, adminMode, todayStr, viewingAs = null,
		  onToggle, onAdd, onDelete, onReorder }: Props = $props();

	const PERIODS: { key: RoutinePeriod; label: string; icon: string; hint: string }[] = [
		{ key: 'morning',   label: 'Morning',   icon: '☀️',  hint: 'Before school' },
		{ key: 'afternoon', label: 'Afternoon', icon: '🌤️', hint: 'After school'   },
		{ key: 'evening',   label: 'Evening',   icon: '🌙',  hint: 'Bedtime'       },
	];

	// Which member is being viewed — global viewingAs takes priority
	let internalMemberId = $state<string | null>(untrack(() => members[0]?.id ?? null));
	const activeMemberId = $derived(viewingAs ?? internalMemberId);

	// Set of "routineId|memberId" that are done today
	const doneSet = $derived(new Set(
		completions.map(c => `${c.routineId}|${c.memberId ?? ''}`)
	));

	function isDone(routineId: string, memberId: string | null) {
		return doneSet.has(`${routineId}|${memberId ?? ''}`);
	}

	// Routines visible for the active member (their own + shared ones)
	function routinesFor(period: RoutinePeriod) {
		return routines
			.filter(r => r.period === period)
			.filter(r => activeMemberId === null || r.memberId === null || r.memberId === activeMemberId)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	function doneCount(period: RoutinePeriod) {
		const list = routinesFor(period);
		return list.filter(r => isDone(r.id, activeMemberId)).length;
	}

	// Inline add state per period
	let addingPeriod = $state<RoutinePeriod | null>(null);
	let addText = $state('');
	let addMemberId = $state('');

	function startAdd(period: RoutinePeriod) {
		addingPeriod = period;
		addText = '';
		addMemberId = activeMemberId ?? '';
	}

	function submitAdd() {
		const title = addText.trim();
		if (!title || !addingPeriod) return;
		onAdd(title, addMemberId || null, addingPeriod);
		addText = '';
		addingPeriod = null;
	}

	function handleAddKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submitAdd();
		if (e.key === 'Escape') { addingPeriod = null; }
	}

	function memberColor(id: string | null) {
		if (!id) return '#64748b';
		return members.find(m => m.id === id)?.color ?? '#64748b';
	}

	function memberEmoji(id: string | null) {
		if (!id) return null;
		return members.find(m => m.id === id)?.emoji ?? '👤';
	}

	// Overall progress for the day
	const totalItems = $derived(
		PERIODS.reduce((n, p) => n + routinesFor(p.key).length, 0)
	);
	const totalDone = $derived(
		PERIODS.reduce((n, p) => n + doneCount(p.key), 0)
	);
	const allDone = $derived(totalItems > 0 && totalDone === totalItems);
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-semibold text-white">Routines</h2>
			{#if totalItems > 0}
				{#if allDone}
					<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
						All done! 🎉
					</span>
				{:else}
					<span class="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
						{totalDone}/{totalItems}
					</span>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Member selector — hidden when a global viewingAs is active -->
	{#if members.length > 0 && viewingAs === null}
		<div class="flex flex-wrap gap-1.5">
			{#each members as m (m.id)}
				<button
					onclick={() => internalMemberId = m.id}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
					style="background-color: {activeMemberId === m.id ? m.color : 'transparent'}20;
					       color: {activeMemberId === m.id ? m.color : '#94a3b8'};
					       border: 1.5px solid {activeMemberId === m.id ? m.color : '#334155'};"
				>
					<span>{m.emoji ?? '👤'}</span>
					<span>{m.name}</span>
				</button>
			{/each}
			<button
				onclick={() => internalMemberId = null}
				class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {activeMemberId === null
					? 'bg-slate-500 text-white'
					: 'bg-slate-800 text-slate-500 hover:text-slate-300'}"
			>All</button>
		</div>
	{/if}

	<!-- Period sections -->
	<div class="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
		{#each PERIODS as period (period.key)}
			{@const items = routinesFor(period.key)}
			{@const done = doneCount(period.key)}
			{@const allPeriodDone = items.length > 0 && done === items.length}

			<div class="flex flex-col gap-1">
				<!-- Period header -->
				<div class="flex items-center gap-2 px-1 mb-0.5">
					<span class="text-base leading-none">{period.icon}</span>
					<span class="text-sm font-semibold text-slate-300">{period.label}</span>
					<span class="text-xs text-slate-600">{period.hint}</span>
					{#if items.length > 0}
						<span class="ml-auto text-xs {allPeriodDone ? 'text-green-400' : 'text-slate-600'}">
							{done}/{items.length}
						</span>
					{/if}
					{#if adminMode}
						<button
							onclick={() => startAdd(period.key)}
							class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-blue-400 hover:bg-slate-700 transition-colors text-sm ml-1"
							aria-label="Add {period.label} routine"
						>+</button>
					{/if}
				</div>

				<!-- Items -->
				{#if items.length === 0 && !adminMode}
					<p class="text-xs text-slate-700 px-2 py-1 italic">No {period.label.toLowerCase()} routines yet</p>
				{/if}

				{#each items as routine, i (routine.id)}
					{@const done = isDone(routine.id, activeMemberId)}
					{@const isShared = routine.memberId === null}
					{@const periodItems = items}

					<div class="group flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors {done ? '' : 'hover:bg-slate-800/60'}">
						<!-- Checkbox -->
						<button
							onclick={() => onToggle(routine.id, activeMemberId, !done)}
							class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-all text-sm
								{done
									? 'bg-green-500/20 border-2 border-green-500 text-green-400'
									: 'border-2 border-slate-600 hover:border-green-400 text-transparent'}"
							aria-label="{done ? 'Uncheck' : 'Check'} {routine.title}"
						>{done ? '✓' : ''}</button>

						<!-- Title -->
						<span class="flex-1 text-base transition-colors {done ? 'text-slate-600 line-through' : 'text-slate-200'}">
							{routine.title}
						</span>

						<!-- Member dot (for shared view) -->
						{#if !isShared && activeMemberId === null}
							<span
								class="w-2 h-2 rounded-full shrink-0"
								style="background-color: {memberColor(routine.memberId)}"
								title="{memberEmoji(routine.memberId)} {members.find(m => m.id === routine.memberId)?.name}"
							></span>
						{/if}

						<!-- Admin controls -->
						{#if adminMode}
							<div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
								<button
									onclick={() => onReorder(routine.id, 'up')}
									disabled={i === 0}
									class="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs"
								>▲</button>
								<button
									onclick={() => onReorder(routine.id, 'down')}
									disabled={i === periodItems.length - 1}
									class="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 disabled:opacity-20 text-xs"
								>▼</button>
								<button
									onclick={() => onDelete(routine.id)}
									class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors"
								>✕</button>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Inline add form -->
				{#if addingPeriod === period.key}
					<div class="flex gap-2 px-2 py-2 bg-slate-800 rounded-xl mt-1">
						<!-- svelte:ignore a11y_autofocus -->
						<input
							type="text"
							placeholder="Add a step…"
							bind:value={addText}
							onkeydown={handleAddKey}
							autofocus
							class="flex-1 bg-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
						/>
						{#if members.length > 0}
							<select
								bind:value={addMemberId}
								class="bg-slate-700 text-slate-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
							>
								<option value="">Everyone</option>
								{#each members as m (m.id)}
									<option value={m.id}>{m.emoji ?? '👤'} {m.name}</option>
								{/each}
							</select>
						{/if}
						<button
							onclick={submitAdd}
							disabled={!addText.trim()}
							class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors shrink-0"
						>Add</button>
						<button
							onclick={() => addingPeriod = null}
							class="px-2 py-2 text-slate-500 hover:text-slate-300 text-sm"
						>✕</button>
					</div>
				{/if}
			</div>

			<!-- Divider between periods (not after last) -->
			{#if period.key !== 'evening'}
				<div class="h-px bg-slate-800 mx-1"></div>
			{/if}
		{/each}

		<!-- All done celebration -->
		{#if allDone}
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<span class="text-4xl">🎉</span>
				<p class="text-base font-semibold text-green-400">All routines done!</p>
				<p class="text-xs text-slate-600">Resets tomorrow morning</p>
			</div>
		{/if}
	</div>
</div>
