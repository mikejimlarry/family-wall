<script lang="ts">
	import type { Chore, Member } from '$lib/types';
	import { untrack } from 'svelte';

	type Props = {
		members: Member[];
		chore?: Chore | null;
		onSave: (data: {
			title: string;
			assignedTo: string[];
			dueDate: string | null;
			recurrence: string | null;
			points: number;
		}) => void;
		onClose: () => void;
	};

	let { members, chore = null, onSave, onClose }: Props = $props();

	const isEdit = $derived(Boolean(chore));

	const c = untrack(() => chore);
	let title      = $state(c?.title ?? '');
	let assignedTo = $state<string[]>(c?.assignedTo ?? []);
	let dueDate    = $state(c?.dueDate ?? '');
	let recurrence = $state(c?.recurrence ?? '');
	let points     = $state(c?.points ?? 1);

	function toggleMember(id: string) {
		assignedTo = assignedTo.includes(id)
			? assignedTo.filter(x => x !== id)
			: [...assignedTo, id];
	}

	function submit() {
		if (!title.trim()) return;
		onSave({
			title: title.trim(),
			assignedTo,
			dueDate: dueDate || null,
			recurrence: recurrence || null,
			points
		});
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

<!-- Backdrop -->
<button
	class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
	onclick={onClose}
	aria-label="Close"
></button>

<!-- Modal -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	role="dialog"
	aria-modal="true"
	aria-label="{isEdit ? 'Edit' : 'Add'} chore"
>
	<div class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
		<h3 class="text-lg font-semibold text-white">{isEdit ? 'Edit Chore' : 'Add Chore'}</h3>

		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="chore-title"
			type="text"
			placeholder="Chore name"
			bind:value={title}
			autofocus
			class="bg-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
		/>

		{#if members.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-xs text-slate-400">Assign to</span>
				<div class="flex flex-wrap gap-2">
					{#each members as m (m.id)}
						{@const selected = assignedTo.includes(m.id)}
						<button
							type="button"
							onclick={() => toggleMember(m.id)}
							class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
							style="background-color: {selected ? m.color : 'transparent'}20;
							       color: {selected ? m.color : '#94a3b8'};
							       border: 2px solid {selected ? m.color : '#334155'};"
							aria-pressed={selected}
						>
							<span>{m.emoji ?? '👤'}</span>
							<span>{m.name}</span>
							{#if selected}<span class="text-xs">✓</span>{/if}
						</button>
					{/each}
				</div>
				{#if assignedTo.length === 0}
					<p class="text-xs text-slate-500 italic">No one selected — chore is for everyone</p>
				{/if}
			</div>
		{/if}

		<div class="flex gap-3">
			<div class="flex-1 flex flex-col gap-1">
				<label for="chore-due" class="text-xs text-slate-400">Due date (optional)</label>
				<input
					id="chore-due"
					type="date"
					bind:value={dueDate}
					class="bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
				/>
			</div>
			<div class="flex-1 flex flex-col gap-1">
				<label for="chore-recurrence" class="text-xs text-slate-400">Repeat</label>
				<select
					id="chore-recurrence"
					bind:value={recurrence}
					class="bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">None</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
			</div>
		</div>

		<!-- Points -->
		<div class="flex flex-col gap-1" role="group" aria-label="Points when done">
			<span class="text-xs text-slate-400">⭐ Points when done</span>
			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => { if (points > 1) points--; }}
					class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold transition-colors flex items-center justify-center"
				>−</button>
				<span class="text-2xl font-bold text-white w-8 text-center tabular-nums">{points}</span>
				<button
					type="button"
					onclick={() => { if (points < 10) points++; }}
					class="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold transition-colors flex items-center justify-center"
				>+</button>
				<span class="text-xs text-slate-500 ml-1">{points === 1 ? 'point' : 'points'}</span>
			</div>
		</div>

		<div class="flex gap-2 pt-1">
			<button
				onclick={onClose}
				class="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
			>
				Cancel
			</button>
			<button
				onclick={submit}
				disabled={!title.trim()}
				class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
			>
				{isEdit ? 'Save' : 'Add Chore'}
			</button>
		</div>
	</div>
</div>
