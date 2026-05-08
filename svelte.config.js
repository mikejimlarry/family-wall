import cloudflareAdapter from '@sveltejs/adapter-cloudflare';

function adapter() {
	const base = cloudflareAdapter();
	return {
		...base,
		// Override emulate() so vite dev never calls getPlatformProxy (requires macOS 13.5+).
		// getDatabase() in db/index.ts already falls back to better-sqlite3 when platform is empty.
		emulate() {
			return {
				platform: async () => ({})
			};
		}
	};
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		adapter: adapter(),
		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;
