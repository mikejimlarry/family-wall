import { error, type Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { appSettings } from '$lib/server/db/schema';
import type { AppDb } from '$lib/server/db';

const COOKIE_NAME = 'family_wall_admin';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);
	if (aBytes.length !== bBytes.length) return false;
	let diff = 0;
	for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
	return diff === 0;
}

export async function getAdminPin(db: AppDb): Promise<string | null> {
	const [row] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'admin.pin'));
	return row?.value ?? null;
}

async function sessionSecret(db: AppDb, platform: App.Platform | undefined): Promise<string> {
	const envSecret = (platform?.env as Env & { ADMIN_SESSION_SECRET?: string } | undefined)?.ADMIN_SESSION_SECRET;
	if (envSecret) return envSecret;
	return (await getAdminPin(db)) ?? 'family-wall-local-session';
}

function cookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'strict' as const,
		secure: true,
		maxAge: SESSION_TTL_SECONDS
	};
}

export async function setAdminSession(
	db: AppDb,
	cookies: Cookies,
	platform: App.Platform | undefined
): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
		iat: now,
		exp: now + SESSION_TTL_SECONDS
	})));
	const signature = await sign(payload, await sessionSecret(db, platform));
	cookies.set(COOKIE_NAME, `${payload}.${signature}`, cookieOptions());
}

export function clearAdminSession(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function hasAdminSession(
	db: AppDb,
	cookies: Cookies,
	platform: App.Platform | undefined
): Promise<boolean> {
	const raw = cookies.get(COOKIE_NAME);
	if (!raw) return false;
	const [payload, signature] = raw.split('.');
	if (!payload || !signature) return false;

	const expected = await sign(payload, await sessionSecret(db, platform));
	if (!timingSafeEqual(signature, expected)) return false;

	try {
		const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { exp?: number };
		return typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000);
	} catch {
		return false;
	}
}

export async function requireAdmin(
	db: AppDb,
	cookies: Cookies,
	platform: App.Platform | undefined
): Promise<void> {
	if (!(await hasAdminSession(db, cookies, platform))) {
		throw error(401, 'Parent mode is required');
	}
}
