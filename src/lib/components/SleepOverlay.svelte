<script lang="ts">
	import { onMount } from 'svelte';

	type Props = { onWake: () => void };
	let { onWake }: Props = $props();

	let now     = $state(new Date());
	let visible = $state(false);

	// Bouncing position (top-left corner of the content block)
	let x = $state(0);
	let y = $state(0);
	let vx = $state(0);
	let vy = $state(0);

	// Ref to the content block so we can measure its size
	let contentEl = $state<HTMLDivElement | null>(null);

	const timeStr = $derived(
		now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
	);
	const dateStr = $derived(
		now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
	);

	onMount(() => {
		// Slight fade-in delay
		requestAnimationFrame(() => { visible = true; });

		// Clock tick
		const clockId = setInterval(() => { now = new Date(); }, 10_000);

		// Pick a random starting position and a slow diagonal velocity (~40px/s)
		const speed = 40; // px per second
		const angle = Math.random() * 2 * Math.PI;
		vx = Math.cos(angle) * speed;
		vy = Math.sin(angle) * speed;

		let last = performance.now();
		let rafId: number;

		function step(ts: number) {
			const dt = (ts - last) / 1000; // seconds since last frame
			last = ts;

			if (!contentEl) { rafId = requestAnimationFrame(step); return; }

			const cw = contentEl.offsetWidth;
			const ch = contentEl.offsetHeight;
			const maxX = window.innerWidth  - cw;
			const maxY = window.innerHeight - ch;

			// Initialise to a random valid position on first real frame
			if (x === 0 && y === 0) {
				x = Math.random() * maxX;
				y = Math.random() * maxY;
			}

			x += vx * dt;
			y += vy * dt;

			// Bounce off edges
			if (x <= 0)    { x = 0;    vx =  Math.abs(vx); }
			if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
			if (y <= 0)    { y = 0;    vy =  Math.abs(vy); }
			if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }

			rafId = requestAnimationFrame(step);
		}

		rafId = requestAnimationFrame(step);

		return () => {
			clearInterval(clockId);
			cancelAnimationFrame(rafId);
		};
	});
</script>

<button
	class="sleep-overlay fixed inset-0 z-[100] w-full bg-slate-950 cursor-pointer transition-opacity duration-1000 {visible ? 'opacity-100' : 'opacity-0'}"
	onclick={onWake}
	aria-label="Wake display"
>
	<!-- Bouncing content block -->
	<div
		bind:this={contentEl}
		class="absolute flex flex-col items-center gap-3 pointer-events-none select-none"
		style="left: {x}px; top: {y}px;"
	>
		<!-- Glow -->
		<div class="absolute inset-0 -m-16 rounded-full bg-blue-500/8 animate-pulse blur-2xl pointer-events-none"></div>

		<p class="text-8xl font-thin text-white tracking-tight tabular-nums relative">
			{timeStr}
		</p>
		<p class="text-xl font-light text-slate-400 relative whitespace-nowrap">
			{dateStr}
		</p>
		<p class="text-sm text-slate-700 relative whitespace-nowrap mt-1">
			Tap anywhere to wake
		</p>
	</div>
</button>
