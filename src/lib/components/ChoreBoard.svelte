<script lang="ts">
	import type { Chore, Member } from '$lib/types';

	type Props = {
		chores: Chore[];
		members: Member[];
		adminMode: boolean;
		onMarkDone: (id: string) => void;
		onApprove: (id: string) => void;
		onReject: (id: string) => void;
		onDelete: (id: string) => void;
		onEdit: (chore: Chore) => void;
		onReorder: (id: string, direction: 'up' | 'down') => void;
		onAddChore: () => void;
	};

	let { chores, members, adminMode, onMarkDone, onApprove, onReject, onDelete, onEdit, onReorder, onAddChore }: Props = $props();

	let activeMemberId = $state<string | null>(null);

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	const filteredChores = $derived(
		activeMemberId ? chores.filter((c) => c.assignedTo === activeMemberId) : chores
	);

	// Bucket chores into three groups
	const todo            = $derived(filteredChores.filter((c) => !c.completed && !c.approved).sort((a, b) => a.sortOrder - b.sortOrder));
	const pendingApproval = $derived(filteredChores.filter((c) => c.completed && !c.approved));
	const approved        = $derived(filteredChores.filter((c) => c.approved).sort((a, b) => {
		// Most recently approved first
		const aTime = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
		const bTime = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
		return bTime - aTime;
	}));

	let showHistory = $state(false);

	function memberColor(memberId: string | null) {
		if (!memberId) return '#64748b';
		return memberMap.get(memberId)?.color ?? '#64748b';
	}

	function memberName(memberId: string | null) {
		if (!memberId) return 'Everyone';
		return memberMap.get(memberId)?.name ?? 'Unknown';
	}

	function formatDue(dueDate: string | null) {
		if (!dueDate) return null;
		const d = new Date(dueDate + 'T12:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
		if (diff < 0)  return { label: 'Overdue', overdue: true };
		if (diff === 0) return { label: 'Today', overdue: false };
		if (diff === 1) return { label: 'Tomorrow', overdue: false };
		return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
	}

	function recurrenceLabel(r: string | null) {
		if (!r) return null;
		return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[r] ?? r;
	}

	function formatApprovedAt(approvedAt: Date | null) {
		if (!approvedAt) return '';
		return new Date(approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-semibold text-white">Chores</h2>
			{#if todo.length > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
					{todo.length} left
				</span>
			{:else if pendingApproval.length === 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
					All done!
				</span>
			{/if}
			{#if pendingApproval.length > 0 && adminMode}
				<span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
					{pendingApproval.length} to review
				</span>
			{/if}
		</div>
		{#if adminMode}
			<button
				onclick={onAddChore}
				class="text-xs px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
			>
				+ Add chore
			</button>
		{/if}
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
				style="background-color: {activeMemberId === member.id ? member.color : 'transparent'}; color: {activeMemberId === member.id ? '#fff' : member.color}; border: 1px solid {member.color};"
			>
				{member.name}
			</button>
		{/each}
	</div>

	<!-- Chore list -->
	<div class="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
		{#if todo.length === 0 && pendingApproval.length === 0}
			<div class="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
				<span>No chores! 🎉</span>
				{#if adminMode}
					<button
						onclick={onAddChore}
						class="text-xs px-3 py-1 rounded-full border border-slate-600 hover:border-slate-400 hover:text-slate-300 transition-colors"
					>
						Add one
					</button>
				{/if}
			</div>
		{/if}

		<!-- ── Pending approval ── -->
		{#if pendingApproval.length > 0}
			{#if adminMode}
				<div class="text-xs font-semibold text-blue-400 px-1 mt-1 mb-0.5 flex items-center gap-1">
					<span>⏳</span> Waiting for your review
				</div>
			{/if}
			{#each pendingApproval as chore (chore.id)}
				<div class="group flex items-center gap-3 p-3 rounded-xl {adminMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-slate-800/70'}">
					<div class="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20 shrink-0 flex items-center justify-center text-amber-400 text-xs">
						⏳
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<p class="text-sm text-slate-300 truncate">{chore.title}</p>
							{#if chore.recurrence}
								<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
									↻ {recurrenceLabel(chore.recurrence)}
								</span>
							{/if}
						</div>
						{#if chore.assignedTo}
							<p class="text-xs mt-0.5" style="color: {memberColor(chore.assignedTo)}">
								{memberName(chore.assignedTo)} · waiting for approval
							</p>
						{:else}
							<p class="text-xs mt-0.5 text-slate-500">Waiting for approval</p>
						{/if}
					</div>
					{#if adminMode}
						<div class="flex gap-1.5 shrink-0">
							<button
								onclick={() => onApprove(chore.id)}
								class="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
								title="Approve — chore is done"
							>
								✓ Yes
							</button>
							<button
								onclick={() => onReject(chore.id)}
								class="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
								title="Reject — send back to do again"
							>
								✗ No
							</button>
						</div>
					{/if}
				</div>
			{/each}
		{/if}

		<!-- ── Todo ── -->
		{#each todo as chore, i (chore.id)}
			{@const due = formatDue(chore.dueDate)}
			{@const recur = recurrenceLabel(chore.recurrence)}
			<div class="group flex items-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors">

				<!-- Reorder buttons (admin, no filter active) -->
				{#if adminMode && activeMemberId === null}
					<div class="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onReorder(chore.id, 'up')}
							disabled={i === 0}
							class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
							aria-label="Move up"
						>▲</button>
						<button
							onclick={() => onReorder(chore.id, 'down')}
							disabled={i === todo.length - 1}
							class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
							aria-label="Move down"
						>▼</button>
					</div>
				{/if}

				<!-- Mark-done circle -->
				<button
					onclick={() => onMarkDone(chore.id)}
					class="w-5 h-5 rounded-full border-2 shrink-0 transition-colors hover:border-green-400 hover:bg-green-400/10"
					style="border-color: {memberColor(chore.assignedTo)}"
					aria-label="Mark as done"
				></button>

				<!-- Title + meta -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<p class="text-sm text-slate-200 truncate">{chore.title}</p>
						{#if recur}
							<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 shrink-0">
								↻ {recur}
							</span>
						{/if}
					</div>
					{#if chore.assignedTo}
						<p class="text-xs mt-0.5" style="color: {memberColor(chore.assignedTo)}">
							{memberName(chore.assignedTo)}
						</p>
					{/if}
				</div>

				<!-- Due date badge -->
				{#if due}
					<span class="text-xs px-2 py-0.5 rounded-full shrink-0 {due.overdue ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}">
						{due.label}
					</span>
				{/if}

				<!-- Admin actions -->
				{#if adminMode}
					<div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onEdit(chore)}
							class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-700 transition-colors text-xs"
							aria-label="Edit chore"
						>✎</button>
						<button
							onclick={() => onDelete(chore.id)}
							class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
							aria-label="Delete chore"
						>✕</button>
					</div>
				{/if}
			</div>
		{/each}

		<!-- ── Completed history ── -->
		{#if approved.length > 0}
			<button
				onclick={() => (showHistory = !showHistory)}
				class="mt-3 flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors px-1 font-medium"
			>
				<span class="transition-transform {showHistory ? 'rotate-90' : ''} inline-block">▶</span>
				{approved.length} completed {approved.length === 1 ? 'chore' : 'chores'}
			</button>

			{#if showHistory}
				<div class="flex flex-col gap-1 mt-1">
					{#each approved as chore (chore.id)}
						<div class="group flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40">
							<div class="w-5 h-5 rounded-full border-2 border-green-700 bg-green-700/20 shrink-0 flex items-center justify-center text-green-600 text-xs">✓</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-slate-500 line-through truncate">{chore.title}</p>
								{#if chore.assignedTo || chore.approvedAt}
									<p class="text-xs text-slate-600 mt-0.5">
										{chore.assignedTo ? memberName(chore.assignedTo) : ''}
										{chore.assignedTo && chore.approvedAt ? ' · ' : ''}
										{chore.approvedAt ? formatApprovedAt(chore.approvedAt) : ''}
									</p>
								{/if}
							</div>
							{#if adminMode}
								<button
									onclick={() => onDelete(chore.id)}
									class="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
									aria-label="Delete chore"
								>✕</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
