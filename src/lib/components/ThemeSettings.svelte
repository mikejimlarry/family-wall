<script lang="ts">
	import {
		type ThemeMode, type AutoType, type WeekSchedule,
		DEFAULT_SCHEDULE, DAY_NAMES
	} from '$lib/utils/theme';

	type Props = {
		initialMode:     ThemeMode;
		initialAutoType: AutoType;
		initialSchedule: WeekSchedule;
		hasLocation:     boolean;
		onSave: (mode: ThemeMode, autoType: AutoType, schedule: WeekSchedule) => void;
		onClose: () => void;
	};

	let { initialMode, initialAutoType, initialSchedule, hasLocation, onSave, onClose }: Props = $props();

	let mode     = $state<ThemeMode>(initialMode);
	let autoType = $state<AutoType>(initialAutoType);
	// Deep-copy so edits don't mutate parent state
	let schedule = $state<WeekSchedule>(initialSchedule.map(d => ({ ...d })));

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function applyToAll(day: number) {
		const source = schedule[day];
		schedule = schedule.map(() => ({ ...source }));
	}

	function submit() {
		onSave(mode, autoType, schedule);
		onClose();
	}
</script>

<svelte:window onkeydown={handleKey} />

<!-- Backdrop -->
<button class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onclick={onClose} aria-label="Close"></button>

<!-- Modal -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Theme settings">
	<div class="bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold text-white">🎨 Theme</h3>
			<button onclick={onClose} class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
		</div>

		<!-- Mode selector -->
		<div class="flex flex-col gap-2">
			<span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mode</span>
			<div class="flex gap-2">
				{#each ([['dark', '🌙 Always Dark'], ['auto', '⚡ Auto'], ['light', '☀️ Always Light']] as const) as [val, label]}
					<button
						onclick={() => (mode = val)}
						class="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors {mode === val
							? 'bg-blue-600 text-white'
							: 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
					>{label}</button>
				{/each}
			</div>
		</div>

		<!-- Auto sub-options -->
		{#if mode === 'auto'}
			<div class="flex flex-col gap-3 pl-1 border-l-2 border-blue-600/40">

				<!-- Auto type -->
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Switch based on</span>
					<div class="flex gap-2">
						<button
							onclick={() => (autoType = 'sunset')}
							class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors {autoType === 'sunset'
								? 'bg-slate-600 text-white'
								: 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
						>🌇 Sunrise &amp; Sunset</button>
						<button
							onclick={() => (autoType = 'schedule')}
							class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors {autoType === 'schedule'
								? 'bg-slate-600 text-white'
								: 'bg-slate-700 text-slate-400 hover:bg-slate-600'}"
						>🗓 Custom Schedule</button>
					</div>
				</div>

				{#if autoType === 'sunset'}
					{#if hasLocation}
						<p class="text-sm text-slate-400">
							Light mode turns on at <span class="text-slate-200 font-medium">sunrise</span> and
							switches back to dark at <span class="text-slate-200 font-medium">sunset</span>
							based on your weather location.
						</p>
					{:else}
						<p class="text-sm text-amber-400">
							⚠️ No location set yet. Open the weather widget to set your location first, then sunrise/sunset will be calculated automatically.
						</p>
					{/if}
				{/if}

				{#if autoType === 'schedule'}
					<!-- Per-day schedule grid -->
					<div class="flex flex-col gap-1">
						<div class="grid grid-cols-[3rem_1fr_1fr_auto] gap-x-2 gap-y-1 items-center text-xs text-slate-500 font-semibold uppercase tracking-wide px-1 mb-1">
							<span></span>
							<span>Light from</span>
							<span>Until</span>
							<span></span>
						</div>
						{#each schedule as day, i}
							<div class="grid grid-cols-[3rem_1fr_1fr_auto] gap-x-2 gap-y-0.5 items-center">
								<span class="text-xs font-semibold text-slate-400 text-right pr-1">{DAY_NAMES[i]}</span>
								<input
									type="time"
									bind:value={day.lightFrom}
									class="bg-slate-700 text-white rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
								/>
								<input
									type="time"
									bind:value={day.lightUntil}
									class="bg-slate-700 text-white rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
								/>
								<button
									onclick={() => applyToAll(i)}
									title="Apply to all days"
									class="text-slate-600 hover:text-blue-400 text-xs px-1 py-1 transition-colors whitespace-nowrap"
								>all↓</button>
							</div>
						{/each}
					</div>
				{/if}
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
				class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
			>Save</button>
		</div>
	</div>
</div>
