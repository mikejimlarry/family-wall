<script lang="ts">
	import type { Chore, Member } from '$lib/types';
	import { untrack } from 'svelte';

	type Props = {
		members: Member[];
		chore?: Chore | null; // if provided → edit mode
		onSave: (data: {
			title: string;
			assignedTo: string | null;
			dueDate: string | null;
			recurrence: string | null;
		}) => void;
		onClose: () => void;
	};

	let { members, chore = null, onSave, onClose }: Props = $props();

	const isEdit = $derived(Boolean(chore));

	// Snapshot prop for form initialization
	const c = untrack(() => chore);
	let title      = $state(c?.title ?? '');
	let assignedTo = $state(c?.assignedTo ?? '');
	let dueDate    = $state(c?.dueDate ?? '');
	let recurrence = $state(c?.recurrence ?? '');

	function submit() {
		if (!title.trim()) return;
		onSave({
			title: title.trim(),
			assignedTo: assignedTo || null,
			dueDate: dueDate || null,
			recurrence: recurrence || null
		});
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'Enter' && title.trim()) submit();
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
			<div class="flex flex-col gap-1">
				<label for="chore-assigned" class="text-xs text-slate-400">Assign to</label>
				<select
					id="chore-assigned"
					bind:value={assignedTo}
					class="bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Everyone</option>
					{#each members as member (member.id)}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
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
