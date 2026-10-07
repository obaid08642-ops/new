/**
 * P15.4 — safe actions queued while offline, replayed in order on reconnect.
 *
 * Never payments (or bookings, prescriptions, emergency): a queued charge that
 * replays tomorrow is a duplicate charge with a stale price. Only the five
 * safe-optimistic kinds may enter, and every mutation replays under an
 * idempotency key — generated here when the caller did not supply one — so a
 * replay interrupted halfway is still at-most-once on the server.
 *
 * Persistence is behind an injected `OutboxStorage` so the ordering/replay
 * rules are unit-testable in node; the production singleton uses guarded
 * localStorage.
 */

import { isSafeOptimistic } from "../optimistic";
import { IDEMPOTENCY_HEADER, isRetryableRequest } from "./policy";

export const OUTBOX_STORAGE_KEY = "nabd_outbox_v1";
export const OUTBOX_MAX_ACTIONS = 50;

export type OutboxAction = {
  id: string;
  kind: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  enqueuedAt: number;
  idempotencyKey: string | null;
};

export type OutboxEnqueueInput = {
  kind: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

export type OutboxStorage = {
  load(): OutboxAction[];
  save(actions: OutboxAction[]): void;
};

export type OutboxExecutor = (action: OutboxAction) => Promise<Response>;

export type ReplayResult = {
  sent: string[];
  failedId: string | null;
  remaining: number;
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidAction(value: unknown): value is OutboxAction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.kind === "string" &&
    typeof value.url === "string" &&
    typeof value.method === "string" &&
    isRecord(value.headers) &&
    (typeof value.body === "string" || value.body === null) &&
    typeof value.enqueuedAt === "number" &&
    (typeof value.idempotencyKey === "string" || value.idempotencyKey === null)
  );
}

export function memoryOutboxStorage(): OutboxStorage {
  let actions: OutboxAction[] = [];
  return {
    load: () => [...actions],
    save: (next) => {
      actions = [...next];
    },
  };
}

/** Guarded: Safari private mode and SSR both make localStorage unusable. */
export function browserOutboxStorage(): OutboxStorage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const storage = window.localStorage;
    return {
      load: () => {
        try {
          const parsed: unknown = JSON.parse(storage.getItem(OUTBOX_STORAGE_KEY) ?? "[]");
          return Array.isArray(parsed) ? parsed.filter(isValidAction) : [];
        } catch {
          return [];
        }
      },
      save: (actions) => {
        try {
          storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(actions));
        } catch {
          /* quota / private mode — the in-memory queue still drains this session */
        }
      },
    };
  } catch {
    return null;
  }
}

export function createOutbox(storage: OutboxStorage = memoryOutboxStorage()) {
  const read = (): OutboxAction[] => {
    try {
      return storage.load().filter(isValidAction);
    } catch {
      return [];
    }
  };
  const write = (actions: OutboxAction[]): void => {
    try {
      storage.save(actions);
    } catch {
      /* a broken store must never break the UI */
    }
  };

  return {
    size: () => read().length,

    list: () => read(),

    enqueue(input: OutboxEnqueueInput, now: number = Date.now()): OutboxAction {
      if (!isSafeOptimistic(input.kind)) {
        throw new Error(`outbox_rejects_${input.kind}`);
      }
      const method = (input.method ?? "POST").toUpperCase();
      const headers = { ...(input.headers ?? {}) };
      const existingName = Object.keys(headers).find((name) => name.toLowerCase() === IDEMPOTENCY_HEADER);
      const existingKey = existingName && String(headers[existingName]).trim() ? String(headers[existingName]) : null;
      if (existingName && !existingKey) delete headers[existingName];
      // A mutation without a key gets one here, so the replay is at-most-once
      // on the server even if it is interrupted halfway and drained again.
      const idempotencyKey =
        existingKey ?? (method === "GET" || method === "HEAD" || method === "OPTIONS" ? null : newId());
      if (idempotencyKey && !existingKey) headers[IDEMPOTENCY_HEADER] = idempotencyKey;
      if (!isRetryableRequest({ method, headers })) {
        throw new Error("outbox_requires_idempotent_request");
      }

      const action: OutboxAction = {
        id: newId(),
        kind: input.kind,
        url: input.url,
        method,
        headers,
        body: input.body ?? null,
        enqueuedAt: now,
        idempotencyKey,
      };
      const next = [...read(), action].slice(-OUTBOX_MAX_ACTIONS);
      write(next);
      return action;
    },

    remove(id: string): void {
      write(read().filter((action) => action.id !== id));
    },

    clear(): void {
      write([]);
    },

    /**
     * Strict FIFO: actions replay in enqueue order, and the first failure
     * stops the drain with the remainder untouched — a later action must never
     * overtake an earlier one (a dose-log for 08:00 replaying before the
     * 07:00 one would corrupt the log).
     */
    async replay(executor: OutboxExecutor): Promise<ReplayResult> {
      const sent: string[] = [];
      let queue = read();
      while (queue.length > 0) {
        const [action, ...rest] = queue;
        let response: Response;
        try {
          response = await executor(action);
        } catch {
          return { sent, failedId: action.id, remaining: queue.length };
        }
        if (!response.ok) {
          return { sent, failedId: action.id, remaining: queue.length };
        }
        sent.push(action.id);
        queue = rest;
        write(queue);
      }
      return { sent, failedId: null, remaining: 0 };
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;

/** The app singleton. Falls back to memory when storage is unavailable. */
export const outbox: Outbox = createOutbox(browserOutboxStorage() ?? memoryOutboxStorage());
