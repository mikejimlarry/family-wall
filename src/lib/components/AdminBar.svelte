<script lang="ts">
	type Props = {
		adminMode: boolean;
		onUnlock: () => void;
		onLock: () => void;
	};

	let { adminMode, onUnlock, onLock }: Props = $props();

	let showPinPad = $state(false);
	let pin = $state('');
	let shake = $state(false);
	let errorMsg = $state('');

	const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

	function pressDigit(d: string) {
		if (d === '⌫') {
			pin = pin.slice(0, -1);
			errorMsg = '';
		} else if (d && pin.length < 4) {
			pin += d;
			errorMsg = '';
			if (pin.length === 4) verify();
		}
	}

	async function verify() {
		const res = await fetch('/api/admin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pin })
		});
		if (res.ok) {
			showPinPad = false;
			pin = '';
			errorMsg = '';
			onUnlock();
		} else {
			errorMsg = 'Wrong PIN — try again';
			shake = true;
			pin = '';
			setTimeout(() => (shake = false), 500);
		}
	}

	function openPinPad() {
		pin = '';
		errorMsg = '';
		showPinPad = true;
	}

	function closePinPad() {
		showPinPad = false;
		pin = '';
		errorMsg = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closePinPad();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Floating button -->
{#if adminMode}
	<button
		onclick={onLock}
		class="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm shadow-lg transition-colors"
	>
		<span>🔓</span> Parent Mode
	</button>
{:else}
	<button
		onclick={openPinPad}
		class="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm shadow-lg transition-colors"
	>
		<span>🔒</span> Parent Mode
	</button>
{/if}

<!-- PIN pad modal -->
{#if showPinPad}
	<button
		class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
		onclick={closePinPad}
		aria-label="Close"
	></button>

	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Enter PIN"
	>
		<div class="bg-slate-800 rounded-3xl p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6">
			<div class="flex flex-col items-center gap-1">
				<span class="text-3xl">🔐</span>
				<h2 class="text-lg font-semibold text-white">Parent Mode</h2>
				<p class="text-sm text-slate-400">Enter your PIN</p>
			</div>

			<!-- PIN dots -->
			<div class="flex gap-4" class:shake>
				{#each [0,1,2,3] as i}
					<div
						class="w-4 h-4 rounded-full border-2 transition-colors {i < pin.length
							? 'bg-blue-500 border-blue-500'
							: 'border-slate-500'}"
					></div>
				{/each}
			</div>

			{#if errorMsg}
				<p class="text-red-400 text-sm -mt-2">{errorMsg}</p>
			{/if}

			<!-- Numpad -->
			<div class="grid grid-cols-3 gap-3 w-full">
				{#each DIGITS as d}
					{#if d === ''}
						<div></div>
					{:else}
						<button
							onclick={() => pressDigit(d)}
							class="h-16 rounded-2xl text-xl font-medium transition-colors {d === '⌫'
								? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
								: 'bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white'}"
						>
							{d}
						</button>
					{/if}
				{/each}
			</div>

			<button
				onclick={closePinPad}
				class="text-sm text-slate-500 hover:text-slate-300 transition-colors"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}

<style>
	.shake {
		animation: shake 0.4s ease-in-out;
	}
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%       { transform: translateX(-8px); }
		40%       { transform: translateX(8px); }
		60%       { transform: translateX(-6px); }
		80%       { transform: translateX(6px); }
	}
</style>
