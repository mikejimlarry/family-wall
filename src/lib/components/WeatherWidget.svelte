<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { WeatherData } from '$lib/weather';

	type Props = { initialData: WeatherData | null };
	let { initialData }: Props = $props();

	// Intentional one-time capture: seed state from prop, don't re-sync on prop changes
	const seedData = untrack(() => initialData);
	let data = $state<WeatherData | null>(seedData);
	let needsLocation = $state(seedData === null);
	let showEditor = $state(false);
	let loading = $state(false);
	let error = $state('');

	// Location editor state
	let searchQuery = $state('');
	let searchResults = $state<{ name: string; admin1: string; country_code: string; latitude: number; longitude: number }[]>([]);
	let searching = $state(false);
	let searchError = $state('');
	let selectedUnit = $state<'fahrenheit' | 'celsius'>(seedData?.unit ?? 'fahrenheit');

	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function dayName(dateStr: string) {
		return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
	}

	// Simplify verbose condition labels for kids
	function simpleLabel(label: string) {
		const map: Record<string, string> = {
			'Mainly clear': 'Sunny',
			'Light drizzle': 'Drizzly',
			'Heavy drizzle': 'Drizzly',
			'Light rain': 'Rainy',
			'Heavy rain': 'Very Rainy',
			'Light snow': 'Snowy',
			'Heavy snow': 'Very Snowy',
			'Snow grains': 'Snowy',
			'Light showers': 'Showery',
			'Heavy showers': 'Showery',
			'Snow showers': 'Snowy',
			'Icy fog': 'Foggy',
		};
		return map[label] ?? label;
	}

	async function refresh() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/weather');
			const json = await res.json() as WeatherData & { needsLocation?: boolean; error?: string };
			if (json.needsLocation) { needsLocation = true; data = null; }
			else if (json.error) error = json.error;
			else { data = json; needsLocation = false; }
		} catch {
			error = 'Failed to load weather';
		} finally {
			loading = false;
		}
	}

	async function searchLocation() {
		if (!searchQuery.trim()) return;
		searching = true;
		searchResults = [];
		searchError = '';
		try {
			const res = await fetch(
				`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`
			);
			if (!res.ok) throw new Error(`Search failed (${res.status})`);
			const json = await res.json() as { results?: typeof searchResults };
			searchResults = json.results ?? [];
			if (searchResults.length === 0) searchError = 'No locations found — try a different name';
		} catch (e) {
			searchError = e instanceof Error ? e.message : 'Search failed';
		} finally {
			searching = false;
		}
	}

	async function saveLocation(result: typeof searchResults[0]) {
		const res = await fetch('/api/weather', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lat: String(result.latitude),
				lon: String(result.longitude),
				city: `${result.name}, ${result.admin1}`,
				unit: selectedUnit
			})
		});
		if (res.ok) {
			showEditor = false;
			searchQuery = '';
			searchResults = [];
			await refresh();
		}
	}

	// Auto-refresh every 10 minutes
	onMount(() => {
		if (!data && !needsLocation) refresh();
		const id = setInterval(refresh, 10 * 60 * 1000);
		return () => clearInterval(id);
	});
</script>

{#if needsLocation || showEditor}
	<!-- Location editor -->
	<div class="flex flex-col gap-2 min-w-56">
		{#if !showEditor}
			<button
				onclick={() => (showEditor = true)}
				class="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
			>
				<span class="text-xl">🌡️</span>
				<span>Set weather location</span>
			</button>
		{:else}
			<div class="flex flex-col gap-2">
				<div class="flex gap-2">
					<input
						type="text"
						placeholder="Search city…"
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && searchLocation()}
						class="flex-1 bg-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
					/>
					<button
						onclick={searchLocation}
						disabled={searching}
						class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white disabled:opacity-50 shrink-0"
					>
						{searching ? '…' : 'Search'}
					</button>
					<button
						onclick={() => { showEditor = false; searchResults = []; searchError = ''; }}
						class="px-2 py-1.5 text-slate-500 hover:text-slate-300 text-sm"
					>
						✕
					</button>
				</div>

				{#if searchError}
					<p class="text-red-400 text-xs">{searchError}</p>
				{/if}

				<!-- Unit toggle -->
				<div class="flex gap-1 text-xs">
					<button
						onclick={() => (selectedUnit = 'fahrenheit')}
						class="px-2 py-1 rounded-md transition-colors {selectedUnit === 'fahrenheit' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}"
					>°F</button>
					<button
						onclick={() => (selectedUnit = 'celsius')}
						class="px-2 py-1 rounded-md transition-colors {selectedUnit === 'celsius' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}"
					>°C</button>
				</div>

				{#if searchResults.length > 0}
					<ul class="bg-slate-700 rounded-lg overflow-hidden text-sm">
						{#each searchResults as r}
							<li>
								<button
									onclick={() => saveLocation(r)}
									class="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors text-slate-200"
								>
									{r.name}, {r.admin1} <span class="text-slate-500 text-xs">{r.country_code}</span>
								</button>
							</li>
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
	<!-- Main weather display — child-friendly: big emoji, big temp, simple words -->
	<button
		onclick={() => (showEditor = true)}
		class="flex items-center gap-6 group"
		title="Tap to change location"
	>
		<!-- Current conditions -->
		<div class="flex flex-col items-center gap-1">
			<span class="text-5xl leading-none">{data.current.emoji}</span>
			<span class="text-3xl font-semibold text-white leading-none tabular-nums">
				{data.current.temp}°{data.unit === 'fahrenheit' ? 'F' : 'C'}
			</span>
			<span class="text-sm font-medium text-slate-300">{simpleLabel(data.current.label)}</span>
			<span class="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">{data.city}</span>
		</div>

		<!-- Divider -->
		<div class="w-px h-20 bg-slate-700"></div>

		<!-- 3-day forecast tiles -->
		<div class="flex gap-4">
			{#each data.forecast as day (day.date)}
				<div class="flex flex-col items-center gap-1">
					<span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">{dayName(day.date)}</span>
					<span class="text-3xl leading-none">{day.emoji}</span>
					<span class="text-sm font-semibold text-white">{day.high}°</span>
					<span class="text-xs text-slate-500">{day.low}°</span>
				</div>
			{/each}
		</div>
	</button>
{/if}
