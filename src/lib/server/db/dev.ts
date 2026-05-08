import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from './schema';

const DB_PATH = 'dev.db';
const MIGRATIONS_DIR = 'drizzle';

function applyMigrations(sqlite: ReturnType<typeof Database>) {
	sqlite.pragma('foreign_keys = ON');
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS __drizzle_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			applied_at INTEGER NOT NULL
		)
	`);

	const applied = new Set(
		(sqlite.prepare('SELECT name FROM __drizzle_migrations').all() as { name: string }[]).map(
			(r) => r.name
		)
	);

	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		if (applied.has(file)) continue;
		const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
		const statements = sql
			.split('--> statement-breakpoint')
			.map((s) => s.trim())
			.filter(Boolean);
		for (const stmt of statements) {
			sqlite.exec(stmt);
		}
		sqlite.prepare('INSERT INTO __drizzle_migrations (name, applied_at) VALUES (?, ?)').run(
			file,
			Date.now()
		);
		console.log(`[dev-db] Applied migration: ${file}`);
	}

	// Seed initial member on first run
	const memberCount = (
		sqlite.prepare('SELECT COUNT(*) as n FROM family_members').get() as { n: number }
	).n;
	if (memberCount === 0) {
		sqlite
			.prepare(
				`INSERT INTO family_members (id, name, color, emoji, created_at)
				 VALUES ('mike', 'Mike', '#60a5fa', '👤', ?)`
			)
			.run(Date.now());
		console.log('[dev-db] Seeded initial member: Mike');
	}

	// Seed default admin PIN on first run (change via admin settings)
	const pinSet = sqlite.prepare(`SELECT value FROM app_settings WHERE key = 'admin.pin'`).get();
	if (!pinSet) {
		sqlite
			.prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
			.run('admin.pin', '1234', Date.now());
		console.log('[dev-db] Seeded default admin PIN: 1234');
	}

	// Seed weather location on first run
	const locSet = sqlite
		.prepare(`SELECT value FROM app_settings WHERE key = 'weather.lat'`)
		.get();
	if (!locSet) {
		const now = Date.now();
		sqlite
			.prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
			.run('weather.lat', '39.1732', now);
		sqlite
			.prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
			.run('weather.lon', '-77.2717', now);
		sqlite
			.prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
			.run('weather.city', 'Germantown, MD', now);
		sqlite
			.prepare(`INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`)
			.run('weather.unit', 'fahrenheit', now);
		console.log('[dev-db] Seeded weather location: Germantown, MD');
	}
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDevDb() {
	if (!_db) {
		const sqlite = new Database(DB_PATH);
		applyMigrations(sqlite);
		_db = drizzle(sqlite, { schema });
	}
	return _db;
}
