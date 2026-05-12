<script lang="ts">
	import type { Member } from '$lib/types';

	let { members }: { members: Member[] } = $props();

	// Random positions generated once on mount — stable per session, different each load
	const MAX = 10;
	const positions = Array.from({ length: MAX }, () => ({
		x:     Math.random() * 80 + 10,   // 10–90 %
		y:     Math.random() * 80 + 10,
		size:  Math.random() * 350 + 250, // 250–600 px
		drift: Math.floor(Math.random() * 4),
		dur:   45 + Math.random() * 35,   // 45–80 s
		delay: -(Math.random() * 40),     // stagger start
	}));

	const blobs = $derived.by(() => {
		if (!members.length) return [];
		const count = Math.min(members.length * 2, MAX);
		return positions.slice(0, count).map((pos, i) => ({
			...pos,
			color: members[i % members.length].color,
		}));
	});
</script>

<div class="fixed inset-0 overflow-hidden pointer-events-none" style="z-index:0" aria-hidden="true">
	{#each blobs as b (b.x + b.y)}
		<div
			class="blob absolute rounded-full"
			style="
				left: {b.x}%;
				top: {b.y}%;
				width: {b.size}px;
				height: {b.size}px;
				background: {b.color};
				filter: blur(100px);
				transform: translate(-50%, -50%);
				animation: mesh-{b.drift} {b.dur}s {b.delay}s infinite ease-in-out alternate;
			"
		></div>
	{/each}
</div>

<style>
	.blob {
		opacity: var(--mesh-opacity, 0.2);
		transition: opacity 0.4s ease;
	}

	:global(html.light) .blob {
		opacity: 0.12;
	}

	@keyframes mesh-0 {
		to { transform: translate(-50%, -50%) translate(7%, 10%); }
	}
	@keyframes mesh-1 {
		to { transform: translate(-50%, -50%) translate(-8%, 6%); }
	}
	@keyframes mesh-2 {
		to { transform: translate(-50%, -50%) translate(5%, -8%); }
	}
	@keyframes mesh-3 {
		to { transform: translate(-50%, -50%) translate(-6%, -10%); }
	}
</style>
