<script lang="ts">
	import type { Message, Member } from '$lib/types';

	type Props = {
		messages: Message[];
		members: Member[];
		adminMode: boolean;
		onAdd: (text: string, authorId: string | null, authorName: string | null) => void;
		onDelete: (id: string) => void;
		onTogglePin: (id: string, pinned: boolean) => void;
	};

	let { messages, members, adminMode, onAdd, onDelete, onTogglePin }: Props = $props();

	let newText       = $state('');
	let newAuthorId   = $state('');
	let newAuthorName = $state(''); // admin-only free-text override
	let textareaEl    = $state<HTMLTextAreaElement | null>(null);

	const memberMap = $derived(new Map(members.map((m) => [m.id, m])));

	const sorted = $derived([
		...messages.filter(m => m.pinned),
		...messages.filter(m => !m.pinned)
	]);

	function submitAdd() {
		const text = newText.trim();
		if (!text) return;
		// In admin mode: custom name takes precedence; no member id
		if (adminMode) {
			onAdd(text, null, newAuthorName.trim() || null);
		} else {
			onAdd(text, newAuthorId || null, null);
		}
		newText = '';
		newAuthorName = '';
		textareaEl?.focus();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submitAdd();
		}
	}

	// Display name resolution: custom name > member name > "Anonymous"
	function resolveAuthor(msg: Message): { label: string; color: string | null; emoji: string | null } {
		if (msg.authorName) {
			return { label: msg.authorName, color: null, emoji: null };
		}
		const member = msg.authorId ? memberMap.get(msg.authorId) : null;
		if (member) {
			return { label: member.name, color: member.color, emoji: member.emoji ?? '👤' };
		}
		return { label: 'Anonymous', color: null, emoji: null };
	}

	function formatTime(date: Date | null) {
		if (!date) return '';
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex items-center gap-2">
		<h2 class="text-xl font-semibold text-white">Notes</h2>
		{#if messages.length > 0}
			<span class="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
				{messages.length}
			</span>
		{/if}
	</div>

	<!-- Compose -->
	<div class="flex flex-col gap-2 bg-slate-800 rounded-xl p-3">
		<textarea
			bind:this={textareaEl}
			bind:value={newText}
			onkeydown={handleKey}
			placeholder="Leave a note for the family…"
			rows="2"
			class="w-full bg-slate-700 border border-slate-600 focus:border-slate-500 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
		></textarea>

		<div class="flex gap-2 items-center">
			{#if adminMode}
				<!-- Parent mode: free-text "From" field -->
				<input
					type="text"
					placeholder="From (e.g. Mom, Dad…)"
					bind:value={newAuthorName}
					maxlength="40"
					class="flex-1 bg-slate-700 text-slate-200 placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
				/>
			{:else if members.length > 0}
				<!-- Kid mode: pick from family members -->
				<select
					bind:value={newAuthorId}
					class="flex-1 bg-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="">Anonymous</option>
					{#each members as m (m.id)}
						<option value={m.id}>{m.emoji ?? '👤'} {m.name}</option>
					{/each}
				</select>
			{/if}

			<button
				onclick={submitAdd}
				disabled={!newText.trim()}
				class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shrink-0"
			>Post</button>
		</div>
	</div>

	<!-- Messages list -->
	<div class="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
		{#if sorted.length === 0}
			<div class="flex items-center justify-center h-24 text-slate-600 text-sm">
				No notes yet
			</div>
		{/if}

		{#each sorted as msg (msg.id)}
			{@const author = resolveAuthor(msg)}
			<div class="group relative flex flex-col gap-1 px-4 py-3 rounded-xl transition-colors {msg.pinned ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800'}">

				{#if msg.pinned}
					<span class="absolute top-2.5 right-3 text-amber-400 text-xs font-medium">📌</span>
				{/if}

				<!-- Author + time -->
				<div class="flex items-center gap-2">
					{#if author.emoji}
						<span
							class="text-sm font-semibold"
							style="color: {author.color ?? '#94a3b8'}"
						>{author.emoji} {author.label}</span>
					{:else if author.label !== 'Anonymous'}
						<!-- Custom name with a subtle italic style -->
						<span class="text-sm font-semibold text-slate-300 italic">{author.label}</span>
					{:else}
						<span class="text-sm font-medium text-slate-500">Anonymous</span>
					{/if}
					<span class="text-xs text-slate-600">{formatTime(msg.createdAt)}</span>
				</div>

				<!-- Message text -->
				<p class="text-base text-slate-200 leading-snug whitespace-pre-wrap pr-6">{msg.text}</p>

				<!-- Admin actions -->
				{#if adminMode}
					<div class="absolute bottom-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onclick={() => onTogglePin(msg.id, !msg.pinned)}
							class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-700 transition-colors text-sm"
							aria-label="{msg.pinned ? 'Unpin' : 'Pin'} message"
						>{msg.pinned ? '📌' : '📍'}</button>
						<button
							onclick={() => onDelete(msg.id)}
							class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
							aria-label="Delete message"
						>✕</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
