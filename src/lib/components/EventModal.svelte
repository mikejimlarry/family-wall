<script lang="ts">
	import type { Member } from '$lib/types';

	type Props = {
		members: Member[];
		initialDate?: string;
		onSave: (data: {
			title: string;
			startDate: string;
			allDay: boolean;
			memberId: string | null;
		}) => void;
		onClose: () => void;
	};

	let { members, initialDate, onSave, onClose }: Props = $props();

	const defaultDate = initialDate ?? new Date().toISOString().split('T')[0];
	let title = $state('');
	let startDate = $state(defaultDate);
	let allDay = $state(true);
	let memberId = $state<string>('');

	function submit() {
		if (!title.trim()) return;
		onSave({
			title: title.trim(),
			startDate,
			allDay,
			memberId: memberId || null
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
	aria-label="Add event"
>
	<div class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
		<h3 class="text-lg font-semibold text-white">Add Event</h3>

		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			id="event-title"
			placeholder="Event title"
			bind:value={title}
			autofocus
			class="bg-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
		/>

		<div class="flex gap-3">
			<div class="flex-1 flex flex-col gap-1">
				<label for="event-date" class="text-xs text-slate-400">Date</label>
				<input
					id="event-date"
					type="date"
					bind:value={startDate}
					class="bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="event-allday" class="text-xs text-slate-400">All day</label>
				<button
					id="event-allday"
					onclick={() => (allDay = !allDay)}
					aria-pressed={allDay}
					aria-label="Toggle all day"
					class="mt-0.5 w-12 h-7 rounded-full transition-colors {allDay
						? 'bg-blue-600'
						: 'bg-slate-600'} relative"
				>
					<span
						class="absolute top-1 w-5 h-5 bg-white rounded-full transition-transform {allDay
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
			</div>
		</div>

		{#if members.length > 0}
			<div class="flex flex-col gap-1">
				<label for="event-member" class="text-xs text-slate-400">Who</label>
				<select
					id="event-member"
					bind:value={memberId}
					class="bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Everyone</option>
					{#each members as member (member.id)}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
			</div>
		{/if}

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
				Add Event
			</button>
		</div>
	</div>
</div>
