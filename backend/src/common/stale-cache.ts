/**
 * A tiny read-through cache for hot public reads (`/config`, `/modules`) that every client calls:
 *  - fresh for `ttlMs`;
 *  - SINGLE-FLIGHT: while one load runs, every other caller waits for that same load (a slow database is asked once, not once per request);
 *  - STALE-IF-ERROR: when the load fails or exceeds `loadTimeoutMs`, the last good value is served; only with no value at all does the error reach the caller.
 */
export class StaleCache<T> {
  private value?: { at: number; v: T };
  private inflight?: Promise<T>;
  private generation = 0;

  constructor(private readonly load: () => Promise<T>, private readonly ttlMs: () => number, private readonly loadTimeoutMs = 1500) {}

  async get(): Promise<T> {
    const now = Date.now();
    if (this.value && now - this.value.at < this.ttlMs()) return this.value.v;
    if (!this.inflight) {
      const p: Promise<T> = this.refresh().finally(() => { if (this.inflight === p) this.inflight = undefined; });
      this.inflight = p;
    }
    return this.inflight;
  }

  /** Forget the stored value (a write just changed it). A load already running when this is called does not store its (older) result. */
  clear(): void { this.value = undefined; this.inflight = undefined; this.generation += 1; }

  private async refresh(): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const gen = this.generation;
    try {
      const v = await Promise.race([
        this.load(),
        new Promise<never>((_r, rej) => { timer = setTimeout(() => rej(new Error('load_timeout')), this.loadTimeoutMs); }),
      ]);
      if (gen === this.generation) this.value = { at: Date.now(), v };
      return v;
    } catch (e) {
      if (this.value) return this.value.v;
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
