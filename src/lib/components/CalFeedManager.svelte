<script lang="ts">
	import type { CalendarFeed, CalendarEvent } from '$lib/types';

	type Props = {
		feeds: CalendarFeed[];
		onClose: () => void;
		onFeedsChange: (feeds: CalendarFeed[]) => void;
		onEventsRefresh: (feedId: string, newEvents: CalendarEvent[]) => void;
	};

	let { feeds, onClose, onFeedsChange, onEventsRefresh }: Props = $props();

	// Preset colors to choose from
	const COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fb923c', '#a78bfa', '#facc15', '#f87171', '#38bdf8'];

	let urlInput      = $state('');
	let nameInput     = $state('');
	let colorPick     = $state(COLORS[0]);
	let adding        = $state(false);
	let addError      = $state('');
	let syncingId     = $state<string | null>(null);
	let syncErrors    = $state<Record<string, string>>({});
	let colorPickerId = $state<string | null>(null);

	function formatSynced(d: Date | null) {
		if (!d) return 'never';
		const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
		if (mins < 1)  return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24)  return `${hrs}h ago`;
		return `${Math.floor(hrs / 24)}d ago`;
	}

	async function addFeed() {
		const url = urlInput.trim();
		if (!url) return;
		adding  = true;
		addError = '';
		try {
			const res = await fetch('/api/cal/feeds', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url, name: nameInput.trim() || undefined, color: colorPick })
			});
			const json = await res.json() as { feed: CalendarFeed; syncError?: string };
			if (!res.ok) { addError = (json as { error?: string }).error ?? 'Failed to add'; return; }

			onFeedsChange([...feeds, json.feed]);
			urlInput  = '';
			nameInput = '';
			colorPick = COLORS[feeds.length % COLORS.length];

			if (json.syncError) {
				addError = `Added, but sync failed: ${json.syncError}`;
			} else {
				// Refresh events for this feed from the server
				await refreshEvents(json.feed.id);
			}
		} catch (e) {
			addError = String(e);
		} finally {
			adding = false;
		}
	}

	async function syncFeed(feedId: string) {
		syncingId = feedId;
		syncErrors = { ...syncErrors, [feedId]: '' };
		try {
			const res = await fetch('/api/cal/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ feedId })
			});
			const json = await res.json() as { ok?: boolean; error?: string };
			if (!res.ok || json.error) {
				syncErrors = { ...syncErrors, [feedId]: json.error ?? 'Sync failed' };
			} else {
				// Update lastSyncedAt in local list
				onFeedsChange(feeds.map(f => f.id === feedId ? { ...f, lastSyncedAt: new Date() } : f));
				await refreshEvents(feedId);
			}
		} catch (e) {
			syncErrors = { ...syncErrors, [feedId]: String(e) };
		} finally {
			syncingId = null;
		}
	}

	async function refreshEvents(feedId: string) {
		// Fetch the newly synced events for this feed from the server
		// We do a lightweight fetch of just the events endpoint filtered by source
		const res = await fetch(`/api/cal/events?feedId=${feedId}`);
		if (res.ok) {
			const evts: CalendarEvent[] = await res.json();
			onEventsRefresh(feedId, evts);
		}
	}

	async function updateColor(feedId: string, color: string) {
		colorPickerId = null;
		const res = await fetch(`/api/cal/feeds/${feedId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ color })
		});
		if (res.ok) {
			onFeedsChange(feeds.map(f => f.id === feedId ? { ...f, color } : f));
		}
	}

	async function deleteFeed(feedId: string) {
		const res = await fetch(`/api/cal/feeds/${feedId}`, { method: 'DELETE' });
		if (res.ok) {
			onFeedsChange(feeds.filter(f => f.id !== feedId));
			onEventsRefresh(feedId, []); // remove events from local state
		}
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

<!-- Backdrop -->
<button class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onclick={onClose} aria-label="Close"></button>

<!-- Modal -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Calendar feeds"
>
	<div class="bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto">

		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-white">📅 Calendar Feeds</h3>
			<button onclick={onClose} class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
		</div>

		<!-- How to get a URL -->
		<div class="text-xs text-slate-500 bg-slate-900/60 rounded-xl px-4 py-3 flex flex-col gap-1 leading-relaxed">
			<p class="font-semibold text-slate-400">How to get your calendar URL</p>
			<p><span class="text-blue-400">Google Calendar:</span> Settings → your calendar → "Secret address in iCal format"</p>
			<p><span class="text-slate-300">iCloud:</span> Right-click calendar → Share → enable Public Calendar → copy link</p>
			<p><span class="text-slate-300">Outlook / other:</span> Any public <code class="text-slate-300">.ics</code> or <code class="text-slate-300">webcal://</code> URL works</p>
		</div>

		<!-- Existing feeds -->
		{#if feeds.length > 0}
			<div class="flex flex-col gap-2">
				{#each feeds as feed (feed.id)}
					<div class="flex flex-col gap-2 bg-slate-700/60 rounded-xl px-4 py-3">
						<div class="flex items-center gap-3">
							<!-- Tappable color dot -->
							<button
								onclick={() => colorPickerId = colorPickerId === feed.id ? null : feed.id}
								class="w-4 h-4 rounded-full shrink-0 ring-offset-slate-700 hover:ring-2 hover:ring-white/40 transition-all"
								style="background-color: {feed.color}"
								aria-label="Change color"
								title="Change color"
							></button>

							<!-- Info -->
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-white truncate">{feed.name}</p>
								<p class="text-xs text-slate-500 truncate">{feed.url}</p>
								{#if syncErrors[feed.id]}
									<p class="text-xs text-red-400 mt-0.5">{syncErrors[feed.id]}</p>
								{:else}
									<p class="text-xs text-slate-600 mt-0.5">Synced {formatSynced(feed.lastSyncedAt)}</p>
								{/if}
							</div>

							<!-- Sync button -->
							<button
								onclick={() => syncFeed(feed.id)}
								disabled={syncingId === feed.id}
								class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-600 transition-colors disabled:opacity-40 text-base"
								aria-label="Sync"
							>{syncingId === feed.id ? '⏳' : '↻'}</button>

							<!-- Delete button -->
							<button
								onclick={() => deleteFeed(feed.id)}
								class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-600 transition-colors"
								aria-label="Remove feed"
							>✕</button>
						</div>

						<!-- Inline color picker -->
						{#if colorPickerId === feed.id}
							<div class="flex items-center gap-2 pt-1 pl-7">
								{#each COLORS as c}
									<button
										type="button"
										onclick={() => updateColor(feed.id, c)}
										class="w-6 h-6 rounded-full transition-transform {feed.color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}"
										style="background-color: {c}"
										aria-label="Set color {c}"
									></button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-slate-600 text-center py-2">No feeds added yet</p>
		{/if}

		<!-- Add new feed -->
		<div class="flex flex-col gap-3 border-t border-slate-700 pt-4">
			<p class="text-sm font-medium text-slate-300">Add a calendar</p>

			<input
				type="url"
				placeholder="Paste .ics or webcal:// URL…"
				bind:value={urlInput}
				class="bg-slate-700 border border-slate-600 focus:border-slate-500 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
			/>

			<div class="flex gap-2">
				<input
					type="text"
					placeholder="Label (optional)"
					bind:value={nameInput}
					class="flex-1 bg-slate-700 border border-slate-600 focus:border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
				/>
				<!-- Color picker row -->
				<div class="flex items-center gap-1 shrink-0">
					{#each COLORS as c}
						<button
							type="button"
							onclick={() => colorPick = c}
							class="w-6 h-6 rounded-full transition-transform {colorPick === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}"
							style="background-color: {c}"
							aria-label="Color {c}"
						></button>
					{/each}
				</div>
			</div>

			{#if addError}
				<p class="text-sm text-red-400">{addError}</p>
			{/if}

			<button
				onclick={addFeed}
				disabled={!urlInput.trim() || adding}
				class="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
			>
				{adding ? 'Adding & syncing…' : 'Add Calendar'}
			</button>
		</div>
	</div>
</div>
