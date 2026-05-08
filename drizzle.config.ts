import { defineConfig } from 'drizzle-kit';

const isGenerate = process.argv.includes('generate');

if (!isGenerate) {
	if (!process.env.CLOUDFLARE_ACCOUNT_ID) throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');
	if (!process.env.CLOUDFLARE_DATABASE_ID) throw new Error('CLOUDFLARE_DATABASE_ID is not set');
	if (!process.env.CLOUDFLARE_D1_TOKEN) throw new Error('CLOUDFLARE_D1_TOKEN is not set');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: isGenerate ? undefined : ('d1-http' as never),
	dbCredentials: isGenerate
		? undefined
		: {
				accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
				databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
				token: process.env.CLOUDFLARE_D1_TOKEN!
			},
	verbose: true,
	strict: true
});
