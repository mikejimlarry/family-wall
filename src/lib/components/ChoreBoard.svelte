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

	function todayMidnight() {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	// Active chores split into overdue vs upcoming
	const overdue = $derived.by(() => {
		const now = todayMidnight();
		return filteredChores
			.filter((c) => !c.completed && !c.approved && !!c.dueDate)
			.filter((c) => new Date(c.dueDate! + 'T12:00:00') < now)
			.sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)); // most-overdue first
	});

	// Upcoming = active, not overdue; sorted soonest-due first, then no-due-date by sortOrder
	const upcoming = $derived.by(() => {
		const now = todayMidnight();
		const withDue = filteredChores
			.filter((c) => !c.completed && !c.approved && !!c.dueDate)
			.filter((c) => new Date(c.dueDate! + 'T12:00:00') >= now)
			.sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
		const noDue = filteredChores
			.filter((c) => !c.completed && !c.approved && !c.dueDate)
			.sort((a, b) => a.sortOrder - b.sortOrder);
		return [...withDue, ...noDue];
	});

	const pendingApproval = $derived(filteredChores.filter((c) => c.completed && !c.approved));
	const approved        = $derived(filteredChores.filter((c) => c.approved).sort((a, b) => {
		const aTime = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
		const bTime = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
		return bTime - aTime;
	}));

	// Total active count for the header badge
	const activeCount = $derived(overdue.length + upcoming.length);

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
		const now = todayMidnight();
		const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
		if (diff === 0) return { label: 'Today', overdue: false };
		if (diff === 1) return { label: 'Tomorrow', overdue: false };
		if (diff > 1)   return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
		// Overdue — shouldn't appear inline (shown in banner), but kept as fallback
		const days = Math.abs(diff);
		return { label: days === 1 ? '1 day overdue' : `${days} days overdue`, overdue: true };
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
			{#if overdue.length > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-red-500/25 text-red-400 font-medium">
					{overdue.length} overdue
				</span>
			{/if}
			{#if activeCount > 0}
				<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
					{activeCount} left
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
		{#if activeCount === 0 && pendingApproval.length === 0}
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

		<!-- ── Overdue alert ── -->
		{#if overdue.length > 0}
			<div class="rounded-xl border border-red-700/60 bg-red-950/50 overflow-hidden">
				<div class="flex items-center gap-2 px-3 py-2 border-b border-red-700/40">
					<span class="text-base leading-none">⚠️</span>
					<span class="text-xs font-semibold text-red-400 uppercase tracking-wide">Overdue</span>
				</div>
				<div class="flex flex-col divide-y divide-red-900/40">
					{#each overdue as chore (chore.id)}
						{@const recur = recurrenceLabel(chore.recurrence)}
						{@const daysDiff = Math.abs(Math.floor((new Date(chore.dueDate! + 'T12:00:00').getTime() - todayMidnight().getTime()) / 86400000))}
						<div class="group flex items-center gap-2 px-3 py-2.5">
							<button
								onclick={() => onMarkDone(chore.id)}
								class="w-5 h-5 rounded-full border-2 shrink-0 transition-colors border-red-600 hover:border-red-400 hover:bg-red-400/10"
								aria-label="Mark as done"
							></button>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<p class="text-sm text-red-200 truncate">{chore.title}</p>
									{#if recur}
										<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 shrink-0">↻ {recur}</span>
									{/if}
								</div>
								<p class="text-xs text-red-400/80 mt-0.5">
									{daysDiff === 1 ? '1 day overdue' : `${daysDiff} days overdue`}
									{#if chore.assignedTo} · {memberName(chore.assignedTo)}{/if}
								</p>
							</div>
							{#if adminMode}
								<div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
									<button onclick={() => onEdit(chore)} class="w-7 h-7 flex items-center justify-center rounded-lg text-red-700 hover:text-blue-400 hover:bg-slate-700 transition-colors text-xs" aria-label="Edit">✎</button>
									<button onclick={() => onDelete(chore.id)} class="w-7 h-7 flex items-center justify-center rounded-lg text-red-700 hover:text-red-400 hover:bg-slate-700 transition-colors" aria-label="Delete">✕</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
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

		<!-- ── Upcoming / no-due-date ── -->
		{#each upcoming as chore, i (chore.id)}
			{@const due = formatDue(chore.dueDate)}
			{@const recur = recurrenceLabel(chore.recurrence)}
			<!-- Reorder only applies to no-due-date chores (due-date chores are sorted by date) -->
			{@const canReorder = adminMode && activeMemberId === null && !chore.dueDate}
			<!-- Index among no-due-date chores for disabling first/last arrows -->
			{@const noDueChores = upcoming.filter(c => !c.dueDate)}
			{@const noDueIdx = noDueChores.findIndex(c => c.id === chore.id)}
			<div class="group flex items-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors">

				<!-- Reorder buttons (admin, no filter, no due date) -->
				{#if canReorder}
					<div class="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onReorder(chore.id, 'up')}
							disabled={noDueIdx === 0}
							class="w-5 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
							aria-label="Move up"
						>▲</button>
						<button
							onclick={() => onReorder(chore.id, 'down')}
							disabled={noDueIdx === noDueChores.length - 1}
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
