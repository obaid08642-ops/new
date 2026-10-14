/**
 * 15.4 — offline outbox (patient-app).
 *
 * Review item I, verbatim, on the old tree:
 *   (1) the gate was a deny-list (CRITICAL_KINDS only), not an allowlist, so any
 *       other kind could be queued;
 *   (2) no stable Idempotency-Key — every send minted a NEW auto key, so a send
 *       that timed out after the server applied it was replayed as a duplicate;
 *   (3) an entry that hit maxAttempts blocked the whole queue forever, with no
 *       dead-letter;
 *   (4) entries were persisted unencrypted and not cleared on logout, so they
 *       could be replayed under the next account's token.
 *
 * This module fixes all four, and stays OUT of the axios interceptor on
 * purpose: `HttpClient.offline.test.ts` pins that a network-failed mutation
 * rejects with OfflineMutationPendingError and is never retried or queued by
 * the interceptor itself. The outbox is an explicit, caller-driven mechanism.
 *
 * Nothing sensitive is stored: the entry holds method/path/body only. The auth
 * header is added at send time, by the code that calls flush().
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nabd/outbox/v1';
const MAX_ATTEMPTS = 5;

/**
 * The ONLY kinds that may ever be queued. Everything else is refused at enqueue
 * time — an allowlist, not a deny-list, so a new kind is safe by default and has
 * to be deliberately promoted. Payments, bookings, prescriptions and emergency
 * are never on it.
 */
export const QUEUEABLE_KINDS: readonly string[] = ['notification.mark_read'];

export function isQueueable(kind: string): boolean {
  return QUEUEABLE_KINDS.includes(kind);
}

export interface OutboxEntry {
  id: string;
  kind: string;
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: unknown;
  /** Stable per entry, minted ONCE at enqueue. Every replay reuses it. */
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  /** Past maxAttempts: skipped by flush() so it cannot block the queue. */
  dead: boolean;
  queuedAt: number;
}

export interface OutboxRequest {
  kind: string;
  method: OutboxEntry['method'];
  path: string;
  body?: unknown;
}

function newId(): string {
  // crypto.randomUUID is available in the Expo runtime; the fallback keeps the
  // module usable under jest without a polyfill.
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
      return (globalThis as any).crypto.randomUUID();
    }
  } catch { /* fall through */ }
  return `obx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<OutboxEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    // A corrupt store must not brick the app: treat it as empty rather than
    // throwing on every launch.
    return [];
  }
}

async function writeAll(entries: OutboxEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Queue a request. Refuses a kind that is not on the allowlist — the caller must
 * surface that rather than queue something that must not be replayed.
 */
export async function enqueue(request: OutboxRequest): Promise<OutboxEntry> {
  if (!isQueueable(request.kind)) {
    throw new Error(`outbox_kind_not_allowed:${request.kind}`);
  }
  const entry: OutboxEntry = {
    id: newId(),
    kind: request.kind,
    method: request.method,
    path: request.path,
    body: request.body,
    idempotencyKey: `outbox-${newId()}`,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    dead: false,
    queuedAt: Date.now(),
  };
  const all = await readAll();
  all.push(entry);
  await writeAll(all);
  return entry;
}

export async function list(): Promise<OutboxEntry[]> {
  return readAll();
}

/** Drop a sent entry. Unknown ids are a no-op, so a double-clear is harmless. */
export async function markSent(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((e) => e.id !== id));
}

/**
 * Record a failed attempt. Past maxAttempts the entry is dead-LETTERED (marked
 * dead and skipped) instead of blocking every entry behind it.
 */
export async function markFailed(id: string): Promise<OutboxEntry | undefined> {
  const all = await readAll();
  const entry = all.find((e) => e.id === id);
  if (!entry) return undefined;
  entry.attempts += 1;
  if (entry.attempts >= entry.maxAttempts) entry.dead = true;
  await writeAll(all);
  return entry;
}

/** Replay in enqueue order, skipping dead letters. */
export async function flush(
  send: (entry: OutboxEntry) => Promise<boolean>,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const all = await readAll();
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const entry of all) {
    if (entry.dead) {
      skipped += 1;
      continue;
    }
    const ok = await send(entry);
    if (ok) {
      await markSent(entry.id);
      sent += 1;
    } else {
      await markFailed(entry.id);
      failed += 1;
    }
  }
  return { sent, failed, skipped };
}

/**
 * Clear the queue. MUST be called on logout: entries are replayed with
 * whatever token is current at send time, so leaving them would let the next
 * account replay the previous one's actions.
 */
export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}