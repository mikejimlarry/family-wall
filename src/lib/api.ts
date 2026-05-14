export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export async function apiFetch<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
	const res = await fetch(input, init);
	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const body = await res.json() as { error?: string; message?: string };
			message = body.error ?? body.message ?? message;
		} catch {
			// Keep the status-derived message.
		}
		throw new ApiError(message, res.status);
	}
	if (res.status === 204) return undefined as T;
	return await res.json() as T;
}
