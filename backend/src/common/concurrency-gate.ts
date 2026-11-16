import { ServiceUnavailableException } from '@nestjs/common';

/**
 * At most `max` of the wrapped jobs run at once in this process; the others wait their turn for at most `waitMs`, then are refused with 503 `<reason>` (a client retries, an ISR page serves its last
 * good copy). Run 133 (2026-11-16): a burst of uncached catalogue list queries ran 4-8 at a time in mongod, each loading ~420 MB of documents: the cgroup limit. A cap turns that burst into a short
 * queue and, past the queue's patience, a fast 503 instead of an OOM kill of the database for everyone.
 */
export class ConcurrencyGate {
  private running = 0;
  private readonly queue: Array<() => void> = [];
  rejected = 0;

  constructor(private readonly max: number, private readonly waitMs: number, private readonly reason = 'service_busy', private readonly maxQueue = 50) {}

  get active(): number { return this.running; }
  get waiting(): number { return this.queue.length; }

  async run<T>(job: () => Promise<T>): Promise<T> {
    await this.acquire();
    try { return await job(); } finally { this.release(); }
  }

  private acquire(): Promise<void> {
    if (this.running < this.max) { this.running += 1; return Promise.resolve(); }
    if (this.queue.length >= this.maxQueue) { this.rejected += 1; return Promise.reject(new ServiceUnavailableException(this.reason)); }
    return new Promise<void>((resolve, reject) => {
      let timer: NodeJS.Timeout;
      const turn = () => { clearTimeout(timer); this.running += 1; resolve(); };
      timer = setTimeout(() => {
        const i = this.queue.indexOf(turn);
        if (i >= 0) this.queue.splice(i, 1);
        this.rejected += 1;
        reject(new ServiceUnavailableException(this.reason));
      }, this.waitMs);
      timer.unref?.();
      this.queue.push(turn);
    });
  }

  private release(): void {
    this.running -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}
