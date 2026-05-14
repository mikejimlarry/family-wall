<script lang="ts">
	import type { Chore, Member } from '$lib/types';

	type Props = {
		chores: Chore[];
		members: Member[];
		adminMode: boolean;
		viewingAs?: string | null;
		onMarkDone: (id: string) => void;
		onApprove: (id: string) => void;
		onReject: (id: string) => void;
		onDelete: (id: string) => void;
		onEdit: (chore: Chore) => void;
		onReorder: (id: string, direction: 'up' | 'down') => void;
		onAddChore: () => void;
	};

	let { chores, members, adminMode, viewingAs = null,
	      onMarkDone, onApprove, onReject, onDelete, onEdit, onReorder, onAddChore }: Props = $props();

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	// Internal per-tab filter — only used when no global viewingAs is set
	let internalFilter = $state<string | null>(null);
	const activeMemberId = $derived(viewingAs ?? internalFilter);

	// A chore matches the active filter if:
	//   - no filter set (activeMemberId === null), OR
	//   - chore has no assignees (everyone's chore), OR
	//   - chore is assigned to the active member
	function choreMatchesFilter(c: Chore): boolean {
		if (activeMemberId === null) return true;
		if (c.assignedTo.length === 0) return true;
		return c.assignedTo.includes(activeMemberId);
	}

	const filteredChores = $derived(chores.filter(choreMatchesFilter));

	function todayMidnight() {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}

	const overdue = $derived.by(() => {
		const now = todayMidnight();
		return filteredChores
			.filter((c) => !c.completed && !c.approved && !!c.dueDate)
			.filter((c) => new Date(c.dueDate! + 'T12:00:00') < now)
			.sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
	});

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
	const approved = $derived(filteredChores.filter((c) => c.approved).sort((a, b) => {
		const aTime = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
		const bTime = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
		return bTime - aTime;
	}));

	const activeCount = $derived(overdue.length + upcoming.length);
	let showHistory = $state(false);

	const rewardTiers = [
		{ points: 10, label: 'Pick dessert' },
		{ points: 25, label: 'Movie night' },
		{ points: 50, label: 'Special outing' },
		{ points: 100, label: 'Big reward' }
	];

	const longestStreak = $derived(Math.max(0, ...chores.map((c) => c.streakCount ?? 0)));

	// Primary color for a chore's circle — first assignee's color, or grey
	function choreColor(c: Chore): string {
		if (c.assignedTo.length === 0) return '#64748b';
		return memberMap.get(c.assignedTo[0])?.color ?? '#64748b';
	}

	function memberColor(id: string | null): string {
		if (!id) return '#64748b';
		return memberMap.get(id)?.color ?? '#64748b';
	}

	function memberName(id: string | null): string {
		if (!id) return 'Everyone';
		return memberMap.get(id)?.name ?? 'Unknown';
	}

	// Readable label for a chore's assignees
	function assigneeLabel(c: Chore): string | null {
		if (c.assignedTo.length === 0) return null;
		if (c.assignedTo.length === 1) return memberName(c.assignedTo[0]);
		if (c.assignedTo.length === 2)
			return `${memberName(c.assignedTo[0])} & ${memberName(c.assignedTo[1])}`;
		return `${memberName(c.assignedTo[0])} +${c.assignedTo.length - 1}`;
	}

	function formatDue(dueDate: string | null) {
		if (!dueDate) return null;
		const d = new Date(dueDate + 'T12:00:00');
		const now = todayMidnight();
		const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
		if (diff === 0) return { label: 'Today', overdue: false };
		if (diff === 1) return { label: 'Tomorrow', overdue: false };
		if (diff > 1)   return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
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
			{#if longestStreak >= 3}
				<span class="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">
					🔥 {longestStreak} streak
				</span>
			{/if}
		</div>
		{#if adminMode}
			<button
				onclick={onAddChore}
				class="text-sm px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium"
			>
				+ Add chore
			</button>
		{/if}
	</div>

	<!-- Member filter — hidden when a global viewingAs is active -->
	{#if viewingAs === null}
		<div class="flex flex-wrap gap-1.5">
			<button
				onclick={() => (internalFilter = null)}
				class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors {internalFilter === null
					? 'bg-slate-500 text-white'
					: 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
			>
				All
			</button>
			{#each members as member (member.id)}
				<button
					onclick={() => (internalFilter = internalFilter === member.id ? null : member.id)}
					class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
					style="background-color: {internalFilter === member.id ? member.color : 'transparent'}; color: {internalFilter === member.id ? '#fff' : member.color}; border: 1px solid {member.color};"
				>
					{member.emoji ?? '👤'} {member.name}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Chore list -->
	<div class="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
		{#if activeCount === 0 && pendingApproval.length === 0}
			<div class="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
				<span>No chores! 🎉</span>
				{#if adminMode}
					<button
						onclick={onAddChore}
						class="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-slate-400 hover:text-slate-300 transition-colors"
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
						<div class="group flex items-center gap-2 px-3 py-3">
							<button
								onclick={() => onMarkDone(chore.id)}
								class="w-8 h-8 rounded-full border-2 shrink-0 transition-colors border-red-600 hover:border-red-400 hover:bg-red-400/10"
								aria-label="Mark as done"
							></button>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<p class="text-base text-red-200 truncate">{chore.title}</p>
									{#if recur}
										<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 shrink-0">↻ {recur}</span>
									{/if}
									{#if chore.streakCount >= 2}
										<span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 shrink-0">🔥 {chore.streakCount}</span>
									{/if}
								</div>
								<div class="flex items-center gap-1.5 mt-0.5">
									<p class="text-xs text-red-400/80">
										{daysDiff === 1 ? '1 day overdue' : `${daysDiff} days overdue`}
									</p>
									{#each chore.assignedTo as id}
										{@const m = memberMap.get(id)}
										{#if m}
											<span class="text-xs font-medium" style="color: {m.color}">{m.emoji ?? '👤'} {m.name}</span>
										{/if}
									{/each}
								</div>
							</div>
							{#if adminMode}
								<div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
									<button onclick={() => onEdit(chore)} class="w-9 h-9 flex items-center justify-center rounded-lg text-red-700 hover:text-blue-400 hover:bg-slate-700 transition-colors text-sm" aria-label="Edit">✎</button>
									<button onclick={() => onDelete(chore.id)} class="w-9 h-9 flex items-center justify-center rounded-lg text-red-700 hover:text-red-400 hover:bg-slate-700 transition-colors" aria-label="Delete">✕</button>
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
					<div class="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/20 shrink-0 flex items-center justify-center text-amber-400 text-sm">
						⏳
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<p class="text-base text-slate-300 truncate">{chore.title}</p>
							{#if chore.recurrence}
								<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
									↻ {recurrenceLabel(chore.recurrence)}
								</span>
							{/if}
							{#if chore.streakCount >= 2}
								<span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">🔥 {chore.streakCount}</span>
							{/if}
						</div>
						<div class="flex items-center gap-1.5 mt-0.5">
							{#if chore.assignedTo.length > 0}
								{#each chore.assignedTo as id}
									{@const m = memberMap.get(id)}
									{#if m}
										<span class="text-xs font-medium" style="color: {m.color}">{m.emoji ?? '👤'} {m.name}</span>
									{/if}
								{/each}
								<span class="text-xs text-slate-500">· waiting for approval</span>
							{:else}
								<p class="text-xs text-slate-500">Waiting for approval</p>
							{/if}
						</div>
					</div>
					{#if adminMode}
						<div class="flex gap-1.5 shrink-0">
							<button
								onclick={() => onApprove(chore.id)}
								class="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
								title="Approve — chore is done"
							>
								✓ Yes
							</button>
							<button
								onclick={() => onReject(chore.id)}
								class="px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
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
			{@const canReorder = adminMode && activeMemberId === null && !chore.dueDate}
			{@const noDueChores = upcoming.filter(c => !c.dueDate)}
			{@const noDueIdx = noDueChores.findIndex(c => c.id === chore.id)}
			<div class="group flex items-center gap-2 px-3 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-colors">

				{#if canReorder}
					<div class="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onReorder(chore.id, 'up')}
							disabled={noDueIdx === 0}
							class="w-6 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
							aria-label="Move up"
						>▲</button>
						<button
							onclick={() => onReorder(chore.id, 'down')}
							disabled={noDueIdx === noDueChores.length - 1}
							class="w-6 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default text-xs leading-none"
							aria-label="Move down"
						>▼</button>
					</div>
				{/if}

				<!-- Mark-done circle: colored by first assignee -->
				<button
					onclick={() => onMarkDone(chore.id)}
					class="w-8 h-8 rounded-full border-2 shrink-0 transition-colors hover:border-green-400 hover:bg-green-400/10"
					style="border-color: {choreColor(chore)}"
					aria-label="Mark as done"
				></button>

				<!-- Title + meta -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<p class="text-base text-slate-200 truncate">{chore.title}</p>
						{#if recur}
							<span class="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 shrink-0">
								↻ {recur}
							</span>
						{/if}
						{#if chore.streakCount >= 2}
							<span class="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 shrink-0">
								🔥 {chore.streakCount}
							</span>
						{/if}
					</div>
					<!-- Assignee avatars -->
					{#if chore.assignedTo.length > 0}
						<div class="flex items-center gap-1 mt-0.5 flex-wrap">
							{#each chore.assignedTo as id}
								{@const m = memberMap.get(id)}
								{#if m}
									<span
										class="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
										style="background-color: {m.color}20; color: {m.color};"
									>{m.emoji ?? '👤'} {m.name}</span>
								{/if}
							{/each}
						</div>
					{/if}
				</div>

				{#if due}
					<span class="text-xs px-2 py-0.5 rounded-full shrink-0 {due.overdue ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}">
						{due.label}
					</span>
				{/if}

				{#if adminMode}
					<div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onEdit(chore)}
							class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-700 transition-colors text-sm"
							aria-label="Edit chore"
						>✎</button>
						<button
							onclick={() => onDelete(chore.id)}
							class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
							aria-label="Delete chore"
						>✕</button>
					</div>
				{/if}
			</div>
		{/each}

		<!-- ── Points leaderboard ── -->
		{#if members.filter(m => m.pointsEarned > 0).length > 0}
			{@const ranked = members.filter(m => m.pointsEarned > 0).sort((a, b) => b.pointsEarned - a.pointsEarned)}
			{@const topScore = ranked[0]?.pointsEarned ?? 1}
			<div class="mt-3 rounded-xl bg-slate-800/60 p-3 flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">⭐ Points & rewards</p>
					<span class="text-[11px] text-slate-600">Next milestones</span>
				</div>
				{#each ranked as m (m.id)}
					{@const nextReward = rewardTiers.find((tier) => tier.points > m.pointsEarned)}
					{@const prevPoints = rewardTiers.filter((tier) => tier.points <= m.pointsEarned).at(-1)?.points ?? 0}
					{@const targetPoints = nextReward?.points ?? m.pointsEarned}
					{@const rewardProgress = nextReward ? Math.min(100, Math.round(((m.pointsEarned - prevPoints) / (targetPoints - prevPoints)) * 100)) : 100}
					<div class="flex items-center gap-2">
						<span class="text-base shrink-0">{m.emoji ?? '👤'}</span>
						<span class="text-sm text-slate-300 w-20 truncate shrink-0">{m.name}</span>
						<div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-500"
								style="width: {Math.round((m.pointsEarned / topScore) * 100)}%; background-color: {m.color};"
							></div>
						</div>
						<span class="text-sm font-bold tabular-nums shrink-0" style="color: {m.color}">{m.pointsEarned}</span>
					</div>
					<div class="ml-8 flex items-center gap-2">
						<div class="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden">
							<div class="h-full rounded-full bg-amber-400/80" style="width: {rewardProgress}%"></div>
						</div>
						<span class="w-32 truncate text-[11px] text-slate-500">
							{nextReward ? `${nextReward.points - m.pointsEarned} to ${nextReward.label}` : 'All rewards unlocked'}
						</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ── Completed history ── -->
		{#if approved.length > 0}
			<button
				onclick={() => (showHistory = !showHistory)}
				class="mt-3 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-400 transition-colors px-1 font-medium py-1"
			>
				<span class="transition-transform {showHistory ? 'rotate-90' : ''} inline-block">▶</span>
				{approved.length} completed {approved.length === 1 ? 'chore' : 'chores'}
			</button>

			{#if showHistory}
				<div class="flex flex-col gap-1 mt-1">
					{#each approved as chore (chore.id)}
						<div class="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40">
							<div class="w-8 h-8 rounded-full border-2 border-green-700 bg-green-700/20 shrink-0 flex items-center justify-center text-green-600 text-sm">✓</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-slate-500 line-through truncate">{chore.title}</p>
								{#if chore.assignedTo.length > 0 || chore.approvedAt}
									<p class="text-xs text-slate-600 mt-0.5">
										{chore.assignedTo.map(id => memberName(id)).join(', ')}
										{chore.assignedTo.length > 0 && chore.approvedAt ? ' · ' : ''}
										{chore.approvedAt ? formatApprovedAt(chore.approvedAt) : ''}
									</p>
								{/if}
							</div>
							{#if adminMode}
								<button
									onclick={() => onDelete(chore.id)}
									class="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-all"
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
