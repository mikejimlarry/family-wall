import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
	return drizzle(d1, { schema });
}

export type AppDb = ReturnType<typeof getDb>;

export async function getDatabase(platform: App.Platform | undefined): Promise<AppDb> {
	if (platform?.env?.DB) {
		return getDb(platform.env.DB);
	}
	// Local dev fallback: uses better-sqlite3 with auto-applied migrations
	const { getDevDb } = await import('./dev');
	return getDevDb() as unknown as AppDb;
}
