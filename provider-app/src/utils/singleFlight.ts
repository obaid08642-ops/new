const running = new Set<string>();

/**
 * Runs `fn` unless a call with the same key is still running (a double tap, a second tap while the network is slow). The key is released
 * when `fn` ends, success or failure, so the user can try again. Returns `fn`'s result, or `undefined` when the call was skipped.
 */
export async function runOnce<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (running.has(key)) return undefined;
  running.add(key);
  try { return await fn(); } finally { running.delete(key); }
}

/** The text the server answered with (its own reason: "card payment not completed"), else the fallback; never axios' "Request failed with status code 400". */
export function serverMessage(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
  const text = Array.isArray(m) ? m.join(', ') : m;
  return typeof text === 'string' && text ? text : fallback;
}
