<script lang="ts">
	import type { Member, MemberRole } from '$lib/types';
	import { untrack } from 'svelte';

	type Props = {
		member?: Member | null;
		onSave: (payload: { name: string; color: string; emoji: string; birthday: string | null; role: MemberRole }) => void;
		onDelete?: () => void;
		onClose: () => void;
	};

	let { member = null, onSave, onDelete, onClose }: Props = $props();

	const ROLES: { key: MemberRole; label: string; icon: string; desc: string }[] = [
		{ key: 'parent', label: 'Parent',  icon: '👑', desc: 'Full access'  },
		{ key: 'child',  label: 'Child',   icon: '⭐', desc: 'Kids view'    },
		{ key: 'guest',  label: 'Guest',   icon: '👋', desc: 'Visitor'      },
	];

	const PRESET_COLORS = [
		'#60a5fa', '#34d399', '#f472b6', '#fb923c',
		'#a78bfa', '#facc15', '#f87171', '#2dd4bf',
		'#e879f9', '#94a3b8',
	];

	const PRESET_EMOJIS = ['👤','👦','👧','👨','👩','🧒','🧑','👴','👵','🧔','👱','🧓'];

	const m = untrack(() => member);
	let name          = $state(m?.name     ?? '');
	let color         = $state(m?.color    ?? '#60a5fa');
	let emoji         = $state(m?.emoji    ?? '👤');
	let birthday      = $state(m?.birthday ?? '');
	let role          = $state<MemberRole>(m?.role ?? 'child');
	let nameError     = $state('');
	let confirmDelete = $state(false);

	const isEdit = $derived(Boolean(member));

	function handleSave() {
		if (!name.trim()) { nameError = 'Name is required'; return; }
		onSave({ name: name.trim(), color, emoji, birthday: birthday || null, role });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onclick={onClose} aria-label="Close"></button>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit member' : 'Add member'}>
	<div class="bg-slate-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

		<!-- Header -->
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-bold text-white">{isEdit ? 'Edit Member' : 'Add Member'}</h2>
			<button onclick={onClose} class="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
		</div>

		<!-- Role selector -->
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium text-slate-400">Role</span>
			<div class="flex gap-2">
				{#each ROLES as r}
					<button
						onclick={() => (role = r.key)}
						class="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl text-sm font-semibold transition-all border-2 {role === r.key
							? 'border-blue-500 bg-blue-500/15 text-white'
							: 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'}"
					>
						<span class="text-xl">{r.icon}</span>
						<span>{r.label}</span>
						<span class="text-xs font-normal {role === r.key ? 'text-slate-300' : 'text-slate-600'}">{r.desc}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Emoji preview + picker -->
		<div class="flex flex-col items-center gap-3">
			<div
				class="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
				style="background-color: {color}30; border: 3px solid {color};"
			>{emoji}</div>
			<div class="flex flex-wrap gap-2 justify-center">
				{#each PRESET_EMOJIS as e}
					<button
						onclick={() => (emoji = e)}
						class="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors {emoji === e ? 'bg-slate-600 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}"
					>{e}</button>
				{/each}
			</div>
		</div>

		<!-- Name -->
		<div class="flex flex-col gap-1">
			<label class="text-sm font-medium text-slate-400" for="member-name">Name</label>
			<input
				id="member-name"
				type="text"
				bind:value={name}
				oninput={() => (nameError = '')}
				placeholder="e.g. Mike"
				class="bg-slate-700 border {nameError ? 'border-red-500' : 'border-slate-600'} rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			{#if nameError}
				<p class="text-red-400 text-xs">{nameError}</p>
			{/if}
		</div>

		<!-- Color -->
		<div class="flex flex-col gap-2" role="group" aria-label="Color">
			<span class="text-sm font-medium text-slate-400">Color</span>
			<div class="flex flex-wrap gap-2">
				{#each PRESET_COLORS as c}
					<button
						onclick={() => (color = c)}
						class="w-8 h-8 rounded-full transition-transform {color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-105'}"
						style="background-color: {c};"
						aria-label="Color {c}"
					></button>
				{/each}
			</div>
		</div>

		<!-- Birthday -->
		<div class="flex flex-col gap-1">
			<label class="text-sm font-medium text-slate-400" for="member-birthday">Birthday (optional)</label>
			<input
				id="member-birthday"
				type="date"
				bind:value={birthday}
				class="bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
			/>
		</div>

		<!-- Actions -->
		<div class="flex gap-3 mt-2">
			{#if isEdit && onDelete}
				{#if confirmDelete}
					<div class="flex gap-2 flex-1">
						<button
							onclick={onDelete}
							class="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
						>Confirm Delete</button>
						<button
							onclick={() => (confirmDelete = false)}
							class="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
						>Cancel</button>
					</div>
				{:else}
					<button
						onclick={() => (confirmDelete = true)}
						class="py-3 px-4 rounded-xl bg-slate-700 hover:bg-red-900/50 text-red-400 text-sm transition-colors"
					>Delete</button>
					<button
						onclick={handleSave}
						class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
					>Save</button>
				{/if}
			{:else}
				<button
					onclick={onClose}
					class="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
				>Cancel</button>
				<button
					onclick={handleSave}
					class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
				>Add Member</button>
			{/if}
		</div>
	</div>
</div>
