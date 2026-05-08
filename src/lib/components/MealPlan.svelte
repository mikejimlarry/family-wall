<script lang="ts">
	import type { MealPlan } from '$lib/types';

	type Props = {
		meals: MealPlan[];
		adminMode: boolean;
		onSave:   (date: string, meal: string, notes: string | null) => void;
		onDelete: (date: string) => void;
	};

	let { meals, adminMode, onSave, onDelete }: Props = $props();

	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Build a 7-day window starting from the Monday of the current week
	let weekOffset = $state(0); // 0 = this week, 1 = next week, -1 = last week

	const weekDays = $derived.by(() => {
		const today = new Date();
		const dow = today.getDay();
		const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow + 1 + weekOffset * 7);
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
			return {
				date: toDateStr(d),
				dayName: DAY_NAMES[d.getDay()],
				dayNum: d.getDate(),
				month: d.toLocaleDateString('en-US', { month: 'short' }),
				isToday: toDateStr(d) === toDateStr(today)
			};
		});
	});

	const mealMap = $derived(new Map(meals.map((m) => [m.date, m])));

	// Edit state
	let editingDate = $state<string | null>(null);
	let editValue   = $state('');
	let editNotes   = $state('');

	function toDateStr(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function startEdit(date: string) {
		if (!adminMode) return;
		const existing = mealMap.get(date);
		editingDate = date;
		editValue   = existing?.meal ?? '';
		editNotes   = existing?.notes ?? '';
	}

	function cancelEdit() {
		editingDate = null;
		editValue   = '';
		editNotes   = '';
	}

	function submitEdit() {
		if (!editingDate || !editValue.trim()) return;
		onSave(editingDate, editValue.trim(), editNotes.trim() || null);
		cancelEdit();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
		if (e.key === 'Escape') cancelEdit();
	}

	const weekLabel = $derived.by(() => {
		if (weekOffset === 0) return 'This week';
		if (weekOffset === 1) return 'Next week';
		if (weekOffset === -1) return 'Last week';
		return weekOffset > 0 ? `+${weekOffset} weeks` : `${weekOffset} weeks`;
	});
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold text-white">Meals</h2>
		<!-- Week navigation -->
		<div class="flex items-center gap-1">
			<button
				onclick={() => weekOffset--}
				class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
			>‹</button>
			<button
				onclick={() => weekOffset = 0}
				class="text-xs px-2.5 py-1 rounded-full transition-colors {weekOffset === 0
					? 'bg-slate-600 text-white'
					: 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'}"
			>{weekLabel}</button>
			<button
				onclick={() => weekOffset++}
				class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
			>›</button>
		</div>
	</div>

	<!-- 7-day meal grid -->
	<div class="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
		{#each weekDays as day (day.date)}
			{@const meal = mealMap.get(day.date)}
			{@const isEditing = editingDate === day.date}

			<div class="rounded-xl overflow-hidden {day.isToday ? 'ring-1 ring-blue-500/50' : ''}">
				{#if isEditing}
					<!-- Edit form -->
					<div class="bg-slate-800 p-3 flex flex-col gap-2">
						<div class="flex items-center gap-2 mb-1">
							<span class="text-xs font-semibold text-slate-400">{day.dayName} {day.month} {day.dayNum}</span>
							<button onclick={cancelEdit} class="ml-auto text-slate-600 hover:text-slate-400 text-xs">✕ Cancel</button>
						</div>
						<!-- svelte-ignore a11y_autofocus -->
						<input
							type="text"
							bind:value={editValue}
							onkeydown={handleKey}
							placeholder="What's for dinner?"
							autofocus
							class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
						/>
						<input
							type="text"
							bind:value={editNotes}
							onkeydown={handleKey}
							placeholder="Notes (optional)"
							class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
						/>
						<div class="flex gap-2">
							{#if meal}
								<button
									onclick={() => { onDelete(day.date); cancelEdit(); }}
									class="py-2 px-3 rounded-lg bg-slate-700 hover:bg-red-900/40 text-red-400 text-xs transition-colors"
								>Remove</button>
							{/if}
							<button
								onclick={submitEdit}
								disabled={!editValue.trim()}
								class="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
							>Save</button>
						</div>
					</div>
				{:else}
					<!-- Display row -->
					<button
						onclick={() => startEdit(day.date)}
						disabled={!adminMode}
						class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors {meal
							? 'bg-slate-800/80 hover:bg-slate-800'
							: 'bg-slate-900/40 hover:bg-slate-800/40'} {day.isToday ? 'bg-slate-800' : ''} {adminMode ? 'cursor-pointer' : 'cursor-default'}"
					>
						<!-- Day label -->
						<div class="shrink-0 w-14">
							<p class="text-xs font-semibold {day.isToday ? 'text-blue-400' : 'text-slate-500'}">{day.dayName}</p>
							<p class="text-xs text-slate-600">{day.month} {day.dayNum}</p>
						</div>

						<!-- Meal content -->
						<div class="flex-1 min-w-0">
							{#if meal}
								<p class="text-sm text-slate-200 truncate">{meal.meal}</p>
								{#if meal.notes}
									<p class="text-xs text-slate-500 truncate">{meal.notes}</p>
								{/if}
							{:else}
								<p class="text-sm text-slate-700 italic">{adminMode ? 'Tap to plan…' : '—'}</p>
							{/if}
						</div>

						{#if adminMode}
							<span class="text-slate-700 text-xs shrink-0">✎</span>
						{/if}
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>
