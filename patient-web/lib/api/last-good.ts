/**
 * Public catalogue lists (tests, scans, nursing services) keep serving the last good answer when the backend does not answer
 * (owner rule 2026-10-06: stale-if-error; the error state shows only when there is no copy). A read that fails (no answer,
 * timeout, 5xx, 429) is tried once more, then the last good body of the same address is returned as a normal 200 with
 * `x-served-stale: 1`. A real 4xx (not 429) is passed on unchanged. The copy lives in this server process (bounded), so it
 * covers an outage of the backend, not a restart of the web server.
 */
const MAX_ENTRIES = 200;
const MAX_BYTES = 512 * 1024;
const RETRY_DELAY_MS = 400;
const store = new Map<string, string>();

const failed = (res: Response | null | undefined): boolean => res == null || res.status >= 500 || res.status === 429;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function clearLastGood(): void {
  store.clear();
}

export async function publicListRead(key: string, read: () => Promise<Response | null>, options: { retry?: boolean } = {}): Promise<Response | null> {
  const attempt = async (): Promise<Response | null> => {
    try { return await read(); } catch { return null; }
  };
  let res = await attempt();
  if (failed(res) && options.retry !== false) {
    await pause(RETRY_DELAY_MS);
    res = await attempt();
  }
  if (res?.ok) {
    const body = await res.clone().text().catch(() => "");
    if (body && body.length <= MAX_BYTES) {
      store.delete(key);
      store.set(key, body);
      if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
    }
    return res;
  }
  if (failed(res)) {
    const copy = store.get(key);
    if (copy !== undefined) return new Response(copy, { status: 200, headers: { "content-type": "application/json", "x-served-stale": "1" } });
  }
  return res;
}
