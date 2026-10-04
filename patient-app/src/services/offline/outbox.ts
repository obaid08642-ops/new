/**
 * 15.4 — the outbox: safe actions taken while offline, replayed in order.
 *
 * Rules this module enforces, not merely documents:
 *
 *  • A PAYMENT IS NEVER QUEUED. Money movement is not replayable from a queue:
 *    the user may have already paid, the amount may have changed, and a silent
 *    later charge is the worst possible outcome. `enqueue` throws for a payment,
 *    booking, prescription, or emergency action, and the throw is what the tests
 *    assert.
 *
 *  • ORDER IS PRESERVED. Entries replay strictly in the sequence they were
 *    enqueued. A "mark reminder off" that follows "log dose" must not overtake
 *    it, so the queue is an ordered list and a failed entry STOPS the replay
 *    rather than being skipped.
 *
 *  • A FAILED ENTRY IS KEPT, not dropped, with its attempt count, so nothing is
 *    silently lost, and the caller is told which id failed.
 */
import { apiFetch } from '../../utils/api';
import { CRITICAL_KINDS, type CriticalKind } from '../../utils/optimistic';
import { getConnectivity, isOffline, subscribeConnectivity } from '../http/connectivity';

export const OUTBOX_STORAGE_KEY = '@nabdah_outbox_v1';

/** Actions that must never sit in a queue waiting to be replayed. */
export type ForbiddenOutboxKind = CriticalKind;

export interface OutboxEntry<TBody = unknown> {
  id: string;
  kind: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: TBody;
  headers?: Record<string, string>;
  /** Monotonic sequence, assigned at enqueue time. Defines replay order. */
  sequence: number;
  enqueuedAt: number;
  attempts: number;
  lastError?: string;
}

export class OutboxForbiddenError extends Error {
  readonly kind: string;
  constructor(kind: string) {
    super(`outbox_forbidden_for_${kind}`);
    this.name = 'OutboxForbiddenError';
    this.kind = kind;
  }
}

export function assertQueueable(kind: string): void {
  if ((CRITICAL_KINDS as readonly string[]).includes(kind)) {
    throw new OutboxForbiddenError(kind);
  }
}

export interface StorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface OutboxOptions {
  storage?: StorageLike;
  /** Injected in tests; defaults to the single client. */
  send?: (entry: OutboxEntry) => Promise<unknown>;
  now?: () => number;
  /** How many times an entry is retried before it is parked as failed. */
  maxAttempts?: number;
}

export interface ReplayResult {
  replayed: number;
  failed: string[];
  remaining: number;
}

export class Outbox {
  private entries: OutboxEntry[] = [];
  private sequence = 0;
  private loaded = false;
  private replaying = false;
  private listeners = new Set<(entries: OutboxEntry[]) => void>();
  private unsubscribeConnectivity: (() => void) | null = null;

  private readonly storage: StorageLike | null;
  private readonly send: (entry: OutboxEntry) => Promise<unknown>;
  private readonly now: () => number;
  private readonly maxAttempts: number;

  constructor(options: OutboxOptions = {}) {
    this.storage = options.storage ?? null;
    this.now = options.now ?? (() => Date.now());
    this.maxAttempts = options.maxAttempts ?? 5;
    this.send =
      options.send ??
      ((entry) =>
        apiFetch(entry.endpoint, {
          method: entry.method,
          body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
          headers: entry.headers,
          // A queued action was chosen because the user could not reach the
          // server; retrying it here is the whole point, so a caller-supplied
          // idempotency key must be honoured rather than regenerated.
          retryable: false,
        }));
  }

  // ── persistence ────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    if (this.loaded || !this.storage) {
      this.loaded = true;
      return;
    }
    try {
      const raw = await this.storage.getItem(OUTBOX_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.entries)) {
          this.entries = parsed.entries as OutboxEntry[];
          this.sequence = this.entries.reduce((max, entry) => Math.max(max, entry.sequence), 0);
        }
      }
    } catch {
      // A corrupt outbox must not brick the app; start empty rather than crash.
      this.entries = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    if (!this.storage) return;
    try {
      await this.storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify({ entries: this.entries }));
    } catch {
      // Best-effort: an unwritable store must not lose the in-memory queue.
    }
  }

  // ── queries ────────────────────────────────────────────────────────────────

  async list(): Promise<OutboxEntry[]> {
    await this.load();
    return [...this.entries].sort((a, b) => a.sequence - b.sequence);
  }

  async size(): Promise<number> {
    await this.load();
    return this.entries.length;
  }

  subscribe(listener: (entries: OutboxEntry[]) => void): () => void {
    this.listeners.add(listener);
    void this.list().then(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = [...this.entries].sort((a, b) => a.sequence - b.sequence);
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // A subscriber must not break queue bookkeeping.
      }
    });
  }

  // ── enqueue ────────────────────────────────────────────────────────────────

  async enqueue(input: {
    kind: string;
    method: OutboxEntry['method'];
    endpoint: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<OutboxEntry> {
    assertQueueable(input.kind);
    await this.load();
    this.sequence += 1;
    const entry: OutboxEntry = {
      id: `out-${this.now()}-${this.sequence}`,
      kind: input.kind,
      method: input.method,
      endpoint: input.endpoint,
      body: input.body,
      headers: input.headers,
      sequence: this.sequence,
      enqueuedAt: this.now(),
      attempts: 0,
    };
    this.entries.push(entry);
    await this.persist();
    this.emit();
    return entry;
  }

  /**
   * Enqueue, or run immediately when the device is online. Returns the entry so
   * a screen can tell the user what happened.
   */
  async submit(input: {
    kind: string;
    method: OutboxEntry['method'];
    endpoint: string;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<{ queued: boolean; entry: OutboxEntry }> {
    assertQueueable(input.kind);
    if (!isOffline()) {
      const entry: OutboxEntry = {
        id: `out-${this.now()}-live`,
        kind: input.kind,
        method: input.method,
        endpoint: input.endpoint,
        body: input.body,
        headers: input.headers,
        sequence: 0,
        enqueuedAt: this.now(),
        attempts: 1,
      };
      await this.send(entry);
      return { queued: false, entry };
    }
    const entry = await this.enqueue(input);
    return { queued: true, entry };
  }

  async remove(id: string): Promise<boolean> {
    await this.load();
    const before = this.entries.length;
    this.entries = this.entries.filter((entry) => entry.id !== id);
    const removed = this.entries.length !== before;
    if (removed) await this.persist();
    this.emit();
    return removed;
  }

  async clear(): Promise<void> {
    this.entries = [];
    await this.persist();
    this.emit();
  }

  // ── replay ────────────────────────────────────────────────────────────────

  /**
   * Replay every entry in sequence order.
   *
   * Stops at the first failure: a later entry may depend on an earlier one, and
   * skipping ahead would apply them out of order. The failed entry keeps its
   * place with an incremented attempt count and its error, so nothing is lost.
   */
  async replay(): Promise<ReplayResult> {
    await this.load();
    if (this.replaying) return { replayed: 0, failed: [], remaining: this.entries.length };
    if (getConnectivity().online === false) {
      return { replayed: 0, failed: [], remaining: this.entries.length };
    }

    this.replaying = true;
    let replayed = 0;
    const failed: string[] = [];
    try {
      const ordered = [...this.entries].sort((a, b) => a.sequence - b.sequence);
      for (const entry of ordered) {
        if (entry.attempts >= this.maxAttempts) {
          failed.push(entry.id);
          break;
        }
        try {
          await this.send(entry);
          this.entries = this.entries.filter((candidate) => candidate.id !== entry.id);
          replayed += 1;
        } catch (error) {
          const target = this.entries.find((candidate) => candidate.id === entry.id);
          if (target) {
            target.attempts += 1;
            target.lastError = error instanceof Error ? error.message : String(error);
          }
          failed.push(entry.id);
          break;
        }
      }
    } finally {
      this.replaying = false;
      await this.persist();
      this.emit();
    }
    return { replayed, failed, remaining: this.entries.length };
  }

  /** Replay automatically the moment connectivity returns. */
  startAutoReplay(): () => void {
    if (this.unsubscribeConnectivity) return () => this.stopAutoReplay();
    this.unsubscribeConnectivity = subscribeConnectivity((snapshot) => {
      if (snapshot.online) void this.replay();
    });
    return () => this.stopAutoReplay();
  }

  stopAutoReplay(): void {
    this.unsubscribeConnectivity?.();
    this.unsubscribeConnectivity = null;
  }
}

/** Process-wide outbox. Tests construct their own `Outbox` with injected seams. */
export const outbox = new Outbox({
  storage: {
    getItem: async (key) => {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return AsyncStorage.getItem(key);
    },
    setItem: async (key, value) => {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    },
  },
});
