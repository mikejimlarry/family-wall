<script lang="ts">
	import type { Member } from '$lib/types';
	import type { RecurrenceRule } from '$lib/utils/recurrence';
	import { untrack } from 'svelte';

	type Props = {
		members: Member[];
		initialDate?: string;
		onSave: (data: {
			title: string;
			startDate: string;
			endDate: string | null;
			allDay: boolean;
			memberId: string | null;
			recurrenceRule: string | null;
		}) => void;
		onClose: () => void;
	};

	let { members, initialDate, onSave, onClose }: Props = $props();

	// Intentional one-time capture: form seed from prop, not reactive
	const defaultDate = untrack(() => initialDate) ?? new Date().toISOString().split('T')[0];

	let title     = $state('');
	let startDate = $state(defaultDate);
	let allDay    = $state(true);
	let startTime = $state('09:00');
	let endTime   = $state('10:00');
	let memberId  = $state<string>('');

	// ── Recurrence ────────────────────────────────────────────
	let repeat         = $state(false);
	let rrFreq         = $state<RecurrenceRule['frequency']>('weekly');
	let rrInterval     = $state(1);
	let rrDaysOfWeek   = $state<number[]>([]);
	let rrMonthlyType  = $state<RecurrenceRule['monthlyType']>('date');
	let rrMonthlyDate  = $state(1);
	let rrEndType      = $state<RecurrenceRule['endType']>('never');
	let rrEndCount     = $state(10);
	let rrEndDate      = $state('');

	// Seed recurrence defaults from the chosen start date whenever repeat is toggled on
	$effect(() => {
		if (repeat) {
			const d = new Date(startDate + 'T12:00:00');
			if (rrDaysOfWeek.length === 0) rrDaysOfWeek = [d.getDay()];
			rrMonthlyDate = d.getDate();
		}
	});

	const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

	function toggleDow(d: number) {
		rrDaysOfWeek = rrDaysOfWeek.includes(d)
			? rrDaysOfWeek.filter(x => x !== d)
			: [...rrDaysOfWeek, d];
	}

	const freqLabel = $derived(
		({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' } as const)[rrFreq]
	);

	// ── Submit ────────────────────────────────────────────────
	function submit() {
		if (!title.trim()) return;

		let recurrenceRule: string | null = null;
		if (repeat) {
			const rule: RecurrenceRule = {
				frequency: rrFreq,
				interval: Math.max(1, rrInterval),
				daysOfWeek: rrFreq === 'weekly' ? [...rrDaysOfWeek] : [],
				monthlyType: rrFreq === 'monthly' ? rrMonthlyType : 'date',
				monthlyDate: rrFreq === 'monthly' && rrMonthlyType === 'date' ? rrMonthlyDate : 1,
				endType: rrEndType,
				endCount: rrEndType === 'count' ? Math.max(1, rrEndCount) : 0,
				endDate: rrEndType === 'until' ? rrEndDate : '',
			};
			recurrenceRule = JSON.stringify(rule);
		}

		onSave({
			title: title.trim(),
			startDate: allDay ? startDate : `${startDate}T${startTime}`,
			endDate:   allDay ? null      : `${startDate}T${endTime}`,
			allDay,
			memberId: memberId || null,
			recurrenceRule,
		});
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'Enter' && title.trim()) submit();
	}

	const inputCls = 'bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500';
	const labelCls = 'text-xs text-slate-400';
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
	<div class="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
		<h3 class="text-lg font-semibold text-white">Add Event</h3>

		<!-- Title -->
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			placeholder="Event title"
			bind:value={title}
			autofocus
			class="{inputCls} placeholder-slate-500 focus:ring-2"
		/>

		<!-- Date + All day -->
		<div class="flex gap-3 items-end">
			<div class="flex-1 flex flex-col gap-1">
				<label for="event-date" class={labelCls}>Date</label>
				<input
					id="event-date"
					type="date"
					bind:value={startDate}
					class="{inputCls} [color-scheme:dark]"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="event-allday" class={labelCls}>All day</label>
				<button
					id="event-allday"
					onclick={() => (allDay = !allDay)}
					aria-pressed={allDay}
					aria-label="Toggle all day"
					class="w-12 h-9 rounded-full transition-colors {allDay ? 'bg-blue-600' : 'bg-slate-600'} relative"
				>
					<span
						class="absolute top-2 left-1 w-5 h-5 bg-white rounded-full transition-transform {allDay
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>

		<!-- Time inputs (when not all-day) -->
		{#if !allDay}
			<div class="flex gap-3">
				<div class="flex-1 flex flex-col gap-1">
					<label for="event-start-time" class={labelCls}>Start time</label>
					<input id="event-start-time" type="time" bind:value={startTime} class="{inputCls} [color-scheme:dark]" />
				</div>
				<div class="flex-1 flex flex-col gap-1">
					<label for="event-end-time" class={labelCls}>End time</label>
					<input id="event-end-time" type="time" bind:value={endTime} class="{inputCls} [color-scheme:dark]" />
				</div>
			</div>
		{/if}

		<!-- ── Repeat ─────────────────────────────────────────── -->
		<div class="flex flex-col gap-3 border-t border-slate-700 pt-3">
			<!-- Repeat toggle row -->
			<div class="flex items-center justify-between">
				<span class={labelCls} style="font-size:0.8rem">Repeat</span>
				<button
					onclick={() => (repeat = !repeat)}
					aria-pressed={repeat}
					aria-label="Toggle repeat"
					class="w-12 h-7 rounded-full transition-colors {repeat ? 'bg-blue-600' : 'bg-slate-600'} relative shrink-0"
				>
					<span
						class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform {repeat
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>

			{#if repeat}
				<!-- Every X [freq] -->
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-400 shrink-0">Every</span>
					<input
						type="number"
						min="1"
						max="99"
						bind:value={rrInterval}
						class="w-16 {inputCls} text-center"
					/>
					<select bind:value={rrFreq} class="{inputCls} flex-1">
						<option value="daily">{rrInterval === 1 ? 'day' : 'days'}</option>
						<option value="weekly">{rrInterval === 1 ? 'week' : 'weeks'}</option>
						<option value="monthly">{rrInterval === 1 ? 'month' : 'months'}</option>
						<option value="yearly">{rrInterval === 1 ? 'year' : 'years'}</option>
					</select>
				</div>

				<!-- Weekly: day-of-week selector -->
				{#if rrFreq === 'weekly'}
					<div class="flex gap-1 justify-between">
						{#each DOW_LABELS as lbl, i}
							<button
								type="button"
								onclick={() => toggleDow(i)}
								class="w-9 h-9 rounded-full text-xs font-semibold transition-colors {rrDaysOfWeek.includes(i)
									? 'bg-blue-600 text-white'
									: 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
							>{lbl}</button>
						{/each}
					</div>
				{/if}

				<!-- Monthly: which day -->
				{#if rrFreq === 'monthly'}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (rrMonthlyType = 'date')}
							class="flex-1 py-2 rounded-xl text-sm transition-colors {rrMonthlyType === 'date'
								? 'bg-blue-600 text-white'
								: 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
						>Day of month</button>
						<button
							type="button"
							onclick={() => (rrMonthlyType = 'last')}
							class="flex-1 py-2 rounded-xl text-sm transition-colors {rrMonthlyType === 'last'
								? 'bg-blue-600 text-white'
								: 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
						>Last day</button>
					</div>
					{#if rrMonthlyType === 'date'}
						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-400">On the</span>
							<input
								type="number"
								min="1"
								max="31"
								bind:value={rrMonthlyDate}
								class="w-16 {inputCls} text-center"
							/>
							<span class="text-sm text-slate-400">of the month</span>
						</div>
					{/if}
				{/if}

				<!-- Ends -->
				<div class="flex flex-col gap-2">
					<span class={labelCls}>Ends</span>
					<div class="flex gap-2">
						{#each (['never', 'count', 'until'] as const) as opt}
							<button
								type="button"
								onclick={() => (rrEndType = opt)}
								class="flex-1 py-2 rounded-xl text-xs font-medium transition-colors {rrEndType === opt
									? 'bg-slate-600 text-white'
									: 'bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-slate-300'}"
							>{{ never: 'Never', count: 'After', until: 'By date' }[opt]}</button>
						{/each}
					</div>
					{#if rrEndType === 'count'}
						<div class="flex items-center gap-2">
							<input
								type="number"
								min="1"
								max="999"
								bind:value={rrEndCount}
								class="w-20 {inputCls} text-center"
							/>
							<span class="text-sm text-slate-400">{rrEndCount === 1 ? 'occurrence' : 'occurrences'}</span>
						</div>
					{:else if rrEndType === 'until'}
						<input
							type="date"
							bind:value={rrEndDate}
							class="{inputCls} w-full [color-scheme:dark]"
						/>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Member -->
		{#if members.length > 0}
			<div class="flex flex-col gap-1">
				<label for="event-member" class={labelCls}>Who</label>
				<select id="event-member" bind:value={memberId} class={inputCls}>
					<option value="">Everyone</option>
					{#each members as member (member.id)}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex gap-2 pt-1">
			<button
				onclick={onClose}
				class="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
			>Cancel</button>
			<button
				onclick={submit}
				disabled={!title.trim() || (rrFreq === 'weekly' && repeat && rrDaysOfWeek.length === 0)}
				class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
			>Add Event</button>
		</div>
	</div>
</div>
