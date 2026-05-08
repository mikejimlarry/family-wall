<script lang="ts">
	import { onMount } from 'svelte';

	let now = $state(new Date());

	onMount(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 1000);
		return () => clearInterval(interval);
	});

	const time = $derived(
		now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
	);

	const date = $derived(
		now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
	);
</script>

<div class="flex flex-col">
	<span class="text-6xl font-thin tracking-tight text-white leading-none">{time}</span>
	<span class="text-lg text-slate-400 mt-1">{date}</span>
</div>
