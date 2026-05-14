import { browser } from '$app/environment';

export type QueuedMutation = {
	id: string;
	url: string;
	init: {
		method: string;
		headers?: Record<string, string>;
		body?: string;
	};
	createdAt: number;
};

const STORAGE_KEY = 'family-wall-offline-queue';
const EVENT_NAME = 'family-wall-offline-queue-change';

function readQueue(): QueuedMutation[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as QueuedMutation[];
	} catch {
		return [];
	}
}

function writeQueue(queue: QueuedMutation[]) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function queuedMutationCount(): number {
	return readQueue().length;
}

export function queueMutation(url: string, init: QueuedMutation['init']): number {
	const queue = readQueue();
	queue.push({
		id: crypto.randomUUID(),
		url,
		init,
		createdAt: Date.now()
	});
	writeQueue(queue);
	return queue.length;
}

export async function flushQueuedMutations(): Promise<number> {
	if (!browser || !navigator.onLine) return queuedMutationCount();
	const queue = readQueue();
	const remaining: QueuedMutation[] = [];

	for (const item of queue) {
		try {
			const res = await fetch(item.url, item.init);
			if (!res.ok) remaining.push(item);
		} catch {
			remaining.push(item);
			break;
		}
	}

	writeQueue(remaining);
	return remaining.length;
}

export function onOfflineQueueChange(callback: () => void): () => void {
	if (!browser) return () => {};
	window.addEventListener(EVENT_NAME, callback);
	window.addEventListener('online', callback);
	window.addEventListener('offline', callback);
	return () => {
		window.removeEventListener(EVENT_NAME, callback);
		window.removeEventListener('online', callback);
		window.removeEventListener('offline', callback);
	};
}
