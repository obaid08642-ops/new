/**
 * A tiny read-through cache for hot public reads (`/config`, `/modules`) that every client calls:
 *  - fresh for `ttlMs`;
 *  - SINGLE-FLIGHT: while one load runs, every other caller waits for that same load (a slow database is asked once, not once per request);
 *  - STALE-IF-ERROR: when the load fails or exceeds `loadTimeoutMs`, the last good value is served; only with no value at all does the error reach the caller.
 */
export class StaleCache<T> {
  private value?: { at: number; v: T };
  private inflight?: Promise<T>;

  constructor(private readonly load: () => Promise<T>, private readonly ttlMs: () => number, private readonly loadTimeoutMs = 1500) {}

  async get(): Promise<T> {
    const now = Date.now();
    if (this.value && now - this.value.at < this.ttlMs()) return this.value.v;
    if (!this.inflight) {
      this.inflight = this.refresh().finally(() => { this.inflight = undefined; });
    }
    return this.inflight;
  }

  /** Forget the stored value (a write just changed it). */
  clear(): void { this.value = undefined; }

  private async refresh(): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const v = await Promise.race([
        this.load(),
        new Promise<never>((_r, rej) => { timer = setTimeout(() => rej(new Error('load_timeout')), this.loadTimeoutMs); }),
      ]);
      this.value = { at: Date.now(), v };
      return v;
    } catch (e) {
      if (this.value) return this.value.v;
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
