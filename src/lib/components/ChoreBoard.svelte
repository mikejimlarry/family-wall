<script lang="ts">
	import type { Chore, Member } from '$lib/types';

	type Props = {
		chores: Chore[];
		members: Member[];
		onToggle: (id: string, completed: boolean) => void;
		onDelete: (id: string) => void;
		onAddChore: () => void;
	};

	let { chores, members, onToggle, onDelete, onAddChore }: Props = $props();

	let activeMemberId = $state<string | 'unassigned' | null>(null);

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	const filteredChores = $derived(
		activeMemberId === 'unassigned'
			? chores.filter((c) => !c.assignedTo)
			: activeMemberId
				? chores.filter((c) => c.assignedTo === activeMemberId)
				: chores
	);

	const pendingCount = $derived(filteredChores.filter((c) => !c.completed).length);
	const doneCount = $derived(filteredChores.filter((c) => c.completed).length);

	function memberColor(memberId: string | null) {
		if (!memberId) return '#64748b';
		return memberMap.get(memberId)?.color ?? '#64748b';
	}

	function memberName(memberId: string | null) {
		if (!memberId) return 'Everyone';
		return memberMap.get(memberId)?.name ?? 'Unknown';
	}

	function choreGroups() {
		const pending = filteredChores.filter((c) => !c.completed);
		const done = filteredChores.filter((c) => c.completed);
		return { pending, done };
	}

	const groups = $derived(choreGroups());

	function formatDue(dueDate: string | null) {
		if (!dueDate) return null;
		const d = new Date(dueDate + 'T12:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
		if (diff < 0) return { label: 'Overdue', overdue: true };
		if (diff === 0) return { label: 'Today', overdue: false };
		if (diff === 1) return { label: 'Tomorrow', overdue: false };
		return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
	}
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-semibold text-white">Chores</h2>
			{#if pendingCount > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
					{pendingCount} left
				</span>
			{:else if doneCount > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
					All done!
				</span>
			{/if}
		</div>
		<button
			onclick={onAddChore}
			class="text-xs px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
		>
			+ Add chore
		</button>
	</div>

	<!-- Member filter -->
	<div class="flex flex-wrap gap-1.5">
		<button
			onclick={() => (activeMemberId = null)}
			class="px-3 py-1 rounded-full text-xs font-medium transition-colors {activeMemberId === null
				? 'bg-slate-500 text-white'
				: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
		>
			All
		</button>
		{#each members as member (member.id)}
			<button
				onclick={() => (activeMemberId = activeMemberId === member.id ? null : member.id)}
				class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
				style="background-color: {activeMemberId === member.id
					? member.color
					: 'transparent'}; color: {activeMemberId === member.id
					? '#fff'
					: member.color}; border: 1px solid {member.color};"
			>
				{member.name}
			</button>
		{/each}
	</div>

	<!-- Chore list -->
	<div class="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
		{#if filteredChores.length === 0}
			<div class="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
				<span>No chores here!</span>
				<button
					onclick={onAddChore}
					class="text-xs px-3 py-1 rounded-full border border-slate-600 hover:border-slate-400 hover:text-slate-300 transition-colors"
				>
					Add one
				</button>
			</div>
		{/if}

		{#each groups.pending as chore (chore.id)}
			{@const due = formatDue(chore.dueDate)}
			<div class="group flex items-center gap-3 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors">
				<button
					onclick={() => onToggle(chore.id, true)}
					class="w-5 h-5 rounded-full border-2 shrink-0 transition-colors hover:border-green-400"
					style="border-color: {memberColor(chore.assignedTo)}"
					aria-label="Mark complete"
				></button>
				<div class="flex-1 min-w-0">
					<p class="text-sm text-slate-200 truncate">{chore.title}</p>
					{#if chore.assignedTo}
						<p class="text-xs mt-0.5" style="color: {memberColor(chore.assignedTo)}">
							{memberName(chore.assignedTo)}
						</p>
					{/if}
				</div>
				{#if due}
					<span
						class="text-xs px-2 py-0.5 rounded-full shrink-0 {due.overdue
							? 'bg-red-500/20 text-red-400'
							: 'bg-slate-700 text-slate-400'}"
					>
						{due.label}
					</span>
				{/if}
				<button
					onclick={() => onDelete(chore.id)}
					class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
					aria-label="Delete chore"
				>
					✕
				</button>
			</div>
		{/each}

		{#if groups.done.length > 0}
			<div class="mt-2 mb-1 text-xs text-slate-600 font-medium px-1">Completed</div>
			{#each groups.done as chore (chore.id)}
				<div class="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 transition-colors">
					<button
						onclick={() => onToggle(chore.id, false)}
						class="w-5 h-5 rounded-full border-2 border-green-500 bg-green-500/20 shrink-0 flex items-center justify-center text-green-400 text-xs"
						aria-label="Mark incomplete"
					>
						✓
					</button>
					<p class="text-sm text-slate-500 line-through flex-1 truncate">{chore.title}</p>
					<button
						onclick={() => onDelete(chore.id)}
						class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
						aria-label="Delete chore"
					>
						✕
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>
