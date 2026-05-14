<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { WeatherData, WeatherDay } from '$lib/weather';
	import { apiFetch } from '$lib/api';

	type Props = { initialData: WeatherData | null };
	let { initialData }: Props = $props();

	const seedData = untrack(() => initialData);
	let data         = $state<WeatherData | null>(seedData);
	let needsLocation = $state(seedData === null);
	let showEditor   = $state(false);
	let loading      = $state(false);
	let error        = $state('');
	let selectedDay  = $state<'today' | string | null>(null); // 'today' | YYYY-MM-DD | null

	let searchQuery   = $state('');
	let searchResults = $state<{ name: string; admin1: string; country_code: string; latitude: number; longitude: number }[]>([]);
	let searching     = $state(false);
	let searchError   = $state('');
	let selectedUnit  = $state<'fahrenheit' | 'celsius'>(seedData?.unit ?? 'fahrenheit');

	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const unitSuffix = $derived(data?.unit === 'celsius' ? 'C' : 'F');

	function dayName(dateStr: string) {
		return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
	}

	function simpleLabel(label: string) {
		const map: Record<string, string> = {
			'Mainly clear': 'Sunny', 'Light drizzle': 'Drizzly', 'Heavy drizzle': 'Drizzly',
			'Light rain': 'Rainy', 'Heavy rain': 'Very Rainy', 'Light snow': 'Snowy',
			'Heavy snow': 'Very Snowy', 'Snow grains': 'Snowy', 'Light showers': 'Showery',
			'Heavy showers': 'Showery', 'Snow showers': 'Snowy', 'Icy fog': 'Foggy',
		};
		return map[label] ?? label;
	}

	function formatHour(h: number) {
		if (h === 0)  return '12am';
		if (h < 12)   return `${h}am`;
		if (h === 12) return '12pm';
		return `${h - 12}pm`;
	}

	function toggle(key: 'today' | string) {
		selectedDay = selectedDay === key ? null : key;
	}

	// Morning = 9am, Afternoon = 2pm, Evening = 7pm
	const PERIODS = [
		{ label: 'Morning',   hour: 9,  range: '6am–noon' },
		{ label: 'Afternoon', hour: 14, range: 'noon–6pm' },
		{ label: 'Evening',   hour: 19, range: '6pm–10pm' },
	] as const;

	function periodData(day: WeatherDay) {
		return PERIODS.map(p => {
			const h = day.hours.find(x => x.hour === p.hour) ?? day.hours[p.hour];
			return { ...p, hour_data: h };
		});
	}

	// Hourly strip for today: current hour → 11pm
	function todayHours(day: WeatherDay) {
		const now = new Date().getHours();
		return day.hours.filter(h => h.hour >= now);
	}

	async function refresh() {
		loading = true; error = '';
		try {
			const json = await apiFetch<WeatherData & { needsLocation?: boolean; error?: string }>('/api/weather');
			if (json.needsLocation) { needsLocation = true; data = null; }
			else if (json.error)   error = json.error;
			else { data = json; needsLocation = false; }
		} catch { error = 'Failed to load weather'; }
		finally  { loading = false; }
	}

	async function searchLocation() {
		if (!searchQuery.trim()) return;
		searching = true; searchResults = []; searchError = '';
		try {
			const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
			if (!res.ok) throw new Error(`Search failed (${res.status})`);
			const json = await res.json() as { results?: typeof searchResults };
			searchResults = json.results ?? [];
			if (!searchResults.length) searchError = 'No locations found — try a different name';
		} catch (e) { searchError = e instanceof Error ? e.message : 'Search failed'; }
		finally    { searching = false; }
	}

	async function saveLocation(result: typeof searchResults[0]) {
		try {
			await apiFetch('/api/weather', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lat: String(result.latitude),
					lon: String(result.longitude),
					city: [result.name, result.admin1].filter(Boolean).join(', '),
					unit: selectedUnit
				})
			});
			showEditor = false;
			searchQuery = '';
			searchResults = [];
			await refresh();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save weather location';
		}
	}

	onMount(() => {
		if (!data && !needsLocation) refresh();
		const id = setInterval(refresh, 10 * 60 * 1000);
		return () => clearInterval(id);
	});

	// Close panel on outside click
	let panelEl = $state<HTMLDivElement | null>(null);
	function onDocClick(e: MouseEvent) {
		if (panelEl && !panelEl.contains(e.target as Node)) selectedDay = null;
	}
</script>

<svelte:document onclick={onDocClick} />

{#if needsLocation || showEditor}
	<!-- Location editor -->
	<div class="flex flex-col gap-2 min-w-56">
		{#if !showEditor}
			<button onclick={() => (showEditor = true)} class="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm">
				<span class="text-xl">🌡️</span><span>Set weather location</span>
			</button>
		{:else}
			<div class="flex flex-col gap-2">
				<div class="flex gap-2">
					<input type="text" placeholder="Search city…" bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && searchLocation()}
						class="flex-1 bg-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 min-w-0" />
					<button onclick={searchLocation} disabled={searching}
						class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white disabled:opacity-50 shrink-0">
						{searching ? '…' : 'Search'}
					</button>
					<button onclick={() => { showEditor = false; searchResults = []; searchError = ''; }}
						class="px-2 py-1.5 text-slate-500 hover:text-slate-300 text-sm">✕</button>
				</div>
				{#if searchError}<p class="text-red-400 text-xs">{searchError}</p>{/if}
				<div class="flex gap-1 text-xs">
					<button onclick={() => (selectedUnit = 'fahrenheit')} class="px-2 py-1 rounded-md transition-colors {selectedUnit === 'fahrenheit' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}">°F</button>
					<button onclick={() => (selectedUnit = 'celsius')}    class="px-2 py-1 rounded-md transition-colors {selectedUnit === 'celsius'    ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}">°C</button>
				</div>
				{#if searchResults.length > 0}
					<ul class="bg-slate-700 rounded-lg overflow-hidden text-sm">
						{#each searchResults as r}
							<li><button onclick={() => saveLocation(r)} class="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors text-slate-200">
								{r.name}, {r.admin1} <span class="text-slate-500 text-xs">{r.country_code}</span>
							</button></li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>

{:else if loading && !data}
	<div class="text-slate-500 text-sm animate-pulse">Loading weather…</div>

{:else if error}
	<div class="text-red-400 text-xs">{error}</div>

{:else if data}
	<div class="relative" bind:this={panelEl}>

		<!-- ── Main strip ──────────────────────────────────────── -->
		<div class="flex items-center gap-4">

			<!-- Today (current conditions) -->
			<button
				onclick={(e) => { e.stopPropagation(); toggle('today'); }}
				class="flex flex-col items-center gap-1 rounded-xl px-2 py-1 transition-colors {selectedDay === 'today' ? 'bg-slate-700' : 'hover:bg-slate-800'}"
				title="Tap for today's hourly forecast"
			>
				<span class="text-[10px] text-slate-500">{data.city}</span>
				<span class="text-4xl leading-none">{data.current.emoji}</span>
				<span class="text-2xl font-semibold text-white leading-none tabular-nums">
					{data.current.temp}°{unitSuffix}
				</span>
				<span class="text-xs font-medium text-slate-300">{simpleLabel(data.current.label)}</span>
			</button>

			<div class="w-px h-16 bg-slate-700 shrink-0"></div>

			<!-- Future days -->
			<div class="flex gap-1">
				{#each data.forecast as day (day.date)}
					<button
						onclick={(e) => { e.stopPropagation(); toggle(day.date); }}
						class="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 transition-colors {selectedDay === day.date ? 'bg-slate-700' : 'hover:bg-slate-800'}"
						title="Tap for {dayName(day.date)}'s forecast"
					>
						<span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{dayName(day.date)}</span>
						<span class="text-2xl leading-none">{day.emoji}</span>
						<span class="text-xs font-semibold text-white">{day.high}°</span>
						<span class="text-[10px] text-slate-500">{day.low}°</span>
						{#if day.precipProb >= 20}
							<span class="text-[9px] text-blue-400">{day.precipProb}%💧</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Location / settings -->
			<button
				onclick={(e) => { e.stopPropagation(); selectedDay = null; showEditor = true; }}
				class="text-slate-600 hover:text-slate-400 transition-colors text-xs ml-1 shrink-0"
				title="Change location"
			>✎</button>
		</div>

		<!-- ── Detail panel ────────────────────────────────────── -->
		{#if selectedDay && (selectedDay === 'today' ? data.today?.hours?.length : true)}
			<div
				class="absolute top-full right-0 mt-3 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 p-4"
				style="min-width: 26rem"
				role="presentation"
				onclick={(e) => e.stopPropagation()}
			>
				{#if selectedDay === 'today'}
					{@const hours = todayHours(data.today)}
					{@const nowH  = new Date().getHours()}
					<!-- ── Today: hour-by-hour ──────────────────────── -->
					<p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Today — hour by hour</p>
					<div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
						{#each hours as h (h.hour)}
							<div class="flex flex-col items-center gap-1 shrink-0 rounded-xl px-3 py-2 {h.hour === nowH ? 'bg-blue-600/30 ring-1 ring-blue-500/50' : 'bg-slate-700/60'}">
								<span class="text-[10px] font-semibold text-slate-400 tabular-nums">{formatHour(h.hour)}</span>
								<span class="text-xl leading-none">{h.emoji}</span>
								<span class="text-sm font-semibold text-white tabular-nums">{h.temp}°</span>
								{#if h.precipProb > 0}
									<span class="text-[10px] text-blue-400 tabular-nums">{h.precipProb}%</span>
								{:else}
									<span class="text-[10px] text-slate-600">—</span>
								{/if}
							</div>
						{/each}
					</div>

				{:else}
					<!-- ── Future day: morning / afternoon / evening ── -->
					{@const day = data.forecast.find(d => d.date === selectedDay)}
					{#if day}
						<p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
							{dayName(day.date)} · {day.high}° / {day.low}°
						</p>
						<div class="flex gap-3">
							{#each periodData(day) as period}
								<div class="flex-1 flex flex-col items-center gap-1.5 bg-slate-700/60 rounded-xl px-3 py-3">
									<span class="text-xs font-semibold text-slate-300">{period.label}</span>
									<span class="text-[10px] text-slate-500">{period.range}</span>
									{#if period.hour_data}
										<span class="text-3xl leading-none mt-1">{period.hour_data.emoji}</span>
										<span class="text-lg font-semibold text-white tabular-nums">{period.hour_data.temp}°</span>
										{#if period.hour_data.precipProb > 0}
											<span class="text-xs text-blue-400">{period.hour_data.precipProb}% 💧</span>
										{:else}
											<span class="text-xs text-slate-600">No rain</span>
										{/if}
									{:else}
										<span class="text-slate-500 text-sm mt-1">—</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{/if}

	</div>
{/if}
