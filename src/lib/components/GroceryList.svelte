<script lang="ts">
	import type { GroceryItem } from '$lib/types';

	type Props = {
		items: GroceryItem[];
		adminMode: boolean;
		onCheck:  (id: string, checked: boolean) => void;
		onAdd:    (name: string) => void;
		onDelete: (id: string) => void;
		onClearChecked: () => void;
	};

	let { items, adminMode, onCheck, onAdd, onDelete, onClearChecked }: Props = $props();

	let newItem = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	const unchecked = $derived(items.filter((i) => !i.checked).sort((a, b) => a.sortOrder - b.sortOrder));
	const checked   = $derived(items.filter((i) => i.checked).sort((a, b) => {
		const aT = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
		const bT = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
		return bT - aT; // most recently checked first
	}));

	function submitAdd() {
		const name = newItem.trim();
		if (!name) return;
		onAdd(name);
		newItem = '';
		inputEl?.focus();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submitAdd();
	}
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-semibold text-white">Grocery</h2>
			{#if unchecked.length > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
					{unchecked.length} left
				</span>
			{:else if items.length > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
					All got!
				</span>
			{/if}
		</div>
		{#if adminMode && checked.length > 0}
			<button
				onclick={onClearChecked}
				class="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
			>
				Clear checked
			</button>
		{/if}
	</div>

	<!-- Add item input (always visible) -->
	<div class="flex gap-2">
		<input
			bind:this={inputEl}
			bind:value={newItem}
			onkeydown={handleKey}
			type="text"
			placeholder="Add an item…"
			class="flex-1 bg-slate-800 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
		/>
		<button
			onclick={submitAdd}
			disabled={!newItem.trim()}
			class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
		>Add</button>
	</div>

	<!-- List -->
	<div class="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
		{#if items.length === 0}
			<div class="flex items-center justify-center h-24 text-slate-600 text-sm">
				Nothing on the list yet
			</div>
		{/if}

		<!-- Unchecked -->
		{#each unchecked as item (item.id)}
			<div class="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/60 transition-colors">
				<button
					onclick={() => onCheck(item.id, true)}
					class="w-5 h-5 rounded border-2 border-slate-500 hover:border-green-400 transition-colors shrink-0 flex items-center justify-center"
					aria-label="Mark as got"
				></button>
				<span class="flex-1 text-sm text-slate-200">{item.name}</span>
				{#if adminMode}
					<button
						onclick={() => onDelete(item.id)}
						class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-400 transition-opacity text-xs"
						aria-label="Delete item"
					>✕</button>
				{/if}
			</div>
		{/each}

		<!-- Checked -->
		{#if checked.length > 0}
			<div class="mt-2 mb-1 text-xs text-slate-700 font-medium px-1">✓ In the cart</div>
			{#each checked as item (item.id)}
				<div class="group flex items-center gap-3 p-2.5 rounded-xl transition-colors">
					<button
						onclick={() => onCheck(item.id, false)}
						class="w-5 h-5 rounded border-2 border-green-700 bg-green-700/30 shrink-0 flex items-center justify-center text-green-600 text-xs transition-colors hover:border-slate-500 hover:bg-transparent hover:text-slate-600"
						aria-label="Uncheck"
					>✓</button>
					<span class="flex-1 text-sm text-slate-600 line-through">{item.name}</span>
					{#if adminMode}
						<button
							onclick={() => onDelete(item.id)}
							class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-slate-700 hover:text-red-400 transition-opacity text-xs"
							aria-label="Delete item"
						>✕</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>
