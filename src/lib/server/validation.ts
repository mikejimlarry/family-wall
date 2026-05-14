import { json } from '@sveltejs/kit';

export type ValidationResult<T> =
	| { ok: true; value: T }
	| { ok: false; response: Response };

export async function readJsonObject(request: Request): Promise<ValidationResult<Record<string, unknown>>> {
	try {
		const body = await request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) {
			return badRequest('Expected a JSON object');
		}
		return { ok: true, value: body as Record<string, unknown> };
	} catch {
		return badRequest('Invalid JSON');
	}
}

export function badRequest(message: string): ValidationResult<never> {
	return { ok: false, response: json({ error: message }, { status: 400 }) };
}

export function optionalTrimmedString(
	body: Record<string, unknown>,
	key: string,
	maxLength = 200
): string | undefined {
	const value = body[key];
	if (value == null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string`);
	const trimmed = value.trim();
	if (trimmed.length > maxLength) throw new Error(`${key} is too long`);
	return trimmed;
}

export function requiredTrimmedString(
	body: Record<string, unknown>,
	key: string,
	maxLength = 200
): string {
	const value = optionalTrimmedString(body, key, maxLength);
	if (!value) throw new Error(`${key} is required`);
	return value;
}

export function optionalNullableString(
	body: Record<string, unknown>,
	key: string,
	maxLength = 200
): string | null | undefined {
	const value = body[key];
	if (value === null) return null;
	if (value === undefined) return undefined;
	return optionalTrimmedString(body, key, maxLength) ?? null;
}

export function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
	const value = body[key];
	if (value === undefined) return undefined;
	if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean`);
	return value;
}

export function optionalInteger(
	body: Record<string, unknown>,
	key: string,
	min = Number.MIN_SAFE_INTEGER,
	max = Number.MAX_SAFE_INTEGER
): number | undefined {
	const value = body[key];
	if (value === undefined) return undefined;
	if (typeof value !== 'number') throw new Error(`${key} must be a number`);
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new Error(`${key} must be an integer between ${min} and ${max}`);
	}
	return value;
}

export function optionalStringArray(body: Record<string, unknown>, key: string): string[] | undefined {
	const value = body[key];
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim())) {
		throw new Error(`${key} must be a string array`);
	}
	return value.map((item) => item.trim());
}

export function optionalEnum<T extends string>(
	body: Record<string, unknown>,
	key: string,
	values: readonly T[]
): T | undefined {
	const value = body[key];
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string' || !values.includes(value as T)) {
		throw new Error(`${key} is invalid`);
	}
	return value as T;
}

export function optionalDateString(body: Record<string, unknown>, key: string): string | null | undefined {
	const value = body[key];
	if (value === null) return null;
	if (value === undefined || value === '') return undefined;
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`${key} must be YYYY-MM-DD`);
	}
	return value;
}

export function requiredDateString(body: Record<string, unknown>, key: string): string {
	const value = optionalDateString(body, key);
	if (!value) throw new Error(`${key} is required`);
	return value;
}

export function optionalColor(body: Record<string, unknown>, key: string): string | undefined {
	const value = body[key];
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
		throw new Error(`${key} must be a hex color`);
	}
	return value;
}

export function parseValidated<T>(
	body: Record<string, unknown>,
	validator: (body: Record<string, unknown>) => T
): ValidationResult<T> {
	try {
		return { ok: true, value: validator(body) };
	} catch (err) {
		return badRequest(err instanceof Error ? err.message : 'Invalid request');
	}
}
