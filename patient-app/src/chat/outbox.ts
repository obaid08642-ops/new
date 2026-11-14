import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Messages written without a connection (or that failed to send) wait here, on the device, and go out when the connection returns.
 * Each carries the client message id the server stores, so a retry, an app restart or a double flush never produces a second message.
 * Attachments keep the local file uri and upload on flush; a text message keeps its body.
 */
export interface OutboxItem {
  clientId: string;
  threadId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  body: string;
  asset?: { uri: string; name: string; mime: string; size?: number };
  durationSeconds?: number;
  createdAt: number;
  attempts: number;
}

const KEY = 'chat.outbox.v1';

export async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function save(items: OutboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: the in-memory copy still sends this session */
  }
}

export async function enqueue(item: OutboxItem): Promise<void> {
  const items = await loadOutbox();
  if (items.some((i) => i.clientId === item.clientId)) return;
  await save([...items, item]);
}

export async function remove(clientId: string): Promise<void> {
  await save((await loadOutbox()).filter((i) => i.clientId !== clientId));
}

export async function forThread(threadId: string): Promise<OutboxItem[]> {
  return (await loadOutbox()).filter((i) => i.threadId === threadId).sort((a, b) => a.createdAt - b.createdAt);
}

export const MAX_ATTEMPTS = 3;

/**
 * How a failed send is handled: `transient` (no connection, timeout, expired session) keeps the item and stops the flush so the order
 * is kept; `closed` (the conversation refuses messages, 403) drops it; anything else is `permanent` (the server said no: too big, invalid)
 * and counts an attempt.
 */
export type FailureKind = 'transient' | 'closed' | 'permanent';

export function classifyFailure(e: unknown): FailureKind {
  const message = e instanceof Error ? e.message : '';
  if (message === 'OFFLINE_ERROR' || message === 'REQUEST_TIMEOUT' || message === 'REQUEST_ABORTED' || message.startsWith('AUTH_ERROR_401')) return 'transient';
  if (message.startsWith('AUTH_ERROR_403')) return 'closed';
  return 'permanent';
}

/** An item that failed MAX_ATTEMPTS times is not sent again by a flush; the user can retry it. */
export const isDead = (item: OutboxItem): boolean => item.attempts >= MAX_ATTEMPTS;

async function bump(clientId: string): Promise<number> {
  const items = await loadOutbox();
  let attempts = 0;
  const next = items.map((i) => {
    if (i.clientId !== clientId) return i;
    attempts = i.attempts + 1;
    return { ...i, attempts };
  });
  await save(next);
  return attempts;
}

/** Gives a dead item its attempts back (the user pressed retry). */
export async function resetAttempts(clientId: string): Promise<void> {
  await save((await loadOutbox()).map((i) => (i.clientId === clientId ? { ...i, attempts: 0 } : i)));
}

export interface FlushHooks {
  onSent: (item: OutboxItem, result: unknown) => void;
  onFail: (item: OutboxItem, kind: FailureKind, error: unknown, dead: boolean) => void;
}

/**
 * Sends the queued items of one thread in the order they were written. A connection problem stops the flush (nothing may overtake an
 * older message); a message the server will never accept gets MAX_ATTEMPTS tries and then stops blocking the ones behind it.
 */
export async function flushThread(
  threadId: string,
  send: (item: OutboxItem) => Promise<unknown>,
  hooks: FlushHooks,
): Promise<number> {
  let sent = 0;
  for (const item of await forThread(threadId)) {
    if (isDead(item)) continue;
    try {
      const result = await send(item);
      await remove(item.clientId);
      hooks.onSent(item, result);
      sent++;
    } catch (e) {
      const kind = classifyFailure(e);
      if (kind === 'transient') {
        hooks.onFail(item, kind, e, false);
        break;
      }
      if (kind === 'closed') {
        await remove(item.clientId);
        hooks.onFail(item, kind, e, true);
        continue;
      }
      const dead = (await bump(item.clientId)) >= MAX_ATTEMPTS;
      hooks.onFail({ ...item, attempts: item.attempts + 1 }, kind, e, dead);
      if (!dead) break;
    }
  }
  return sent;
}

let chain: Promise<unknown> = Promise.resolve();

/** Every thread's queue, one flush at a time (the screen, the connection listener and app start may all ask at once). */
export function flushAll(send: (item: OutboxItem) => Promise<unknown>, hooks: FlushHooks): Promise<number> {
  const run = chain.then(async () => {
    const threads = [...new Set((await loadOutbox()).map((i) => i.threadId))];
    let total = 0;
    for (const t of threads) total += await flushThread(t, send, hooks);
    return total;
  });
  chain = run.catch(() => undefined);
  return run;
}
