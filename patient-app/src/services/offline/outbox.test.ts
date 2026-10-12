/**
 * 15.4 — the outbox gate is an ALLOWLIST, the key is stable, a poisoned entry is
 * dead-lettered instead of blocking the queue, and logout clears it.
 *
 * Each assertion names the defect it pins from the review of the old tree.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clear, enqueue, flush, isQueueable, list, markFailed, markSent, QUEUEABLE_KINDS } from './outbox';

const KEY = '@nabd/outbox/v1';

describe('15.4 the patient-app outbox', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('allows only the allowlisted kinds — a new kind is refused by default', () => {
    expect(QUEUEABLE_KINDS).toContain('notification.mark_read');
    expect(isQueueable('notification.mark_read')).toBe(true);
    // The dangerous ones are never queueable.
    for (const kind of ['payment.intent', 'booking.create', 'prescription.upload', 'emergency.sos']) {
      expect(isQueueable(kind)).toBe(false);
    }
  });

  it('REFUSES to queue a kind that is not on the allowlist', async () => {
    await expect(
      enqueue({ kind: 'payment.intent', method: 'POST', path: '/payments/intent' }),
    ).rejects.toThrow(/outbox_kind_not_allowed/);
    expect(await list()).toHaveLength(0);
  });

  it('mints ONE stable Idempotency-Key at enqueue and reuses it on every replay', async () => {
    // Defect (2): every send minted a NEW key, so a replay of a send the server
    // had already applied became a duplicate. The key must not change.
    const entry = await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: 'n1' } });
    const before = entry.idempotencyKey;
    expect(before).toMatch(/^outbox-/);

    const seen: Array<Record<string, unknown>> = [];
    await flush(async (e) => {
      seen.push({ path: e.path, body: e.body, idempotencyKey: (e as any).idempotencyKey });
      return true;
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].idempotencyKey).toBe(before);
  });

  it('dead-letters a permanently failing entry instead of blocking the queue behind it', async () => {
    // Defect (3): an entry at maxAttempts did `break`, so every later entry was
    // stuck forever. It must be skipped, and the entries behind it must flush.
    const first = await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: 'a' } });
    const second = await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: 'b' } });

    // Poison the head of the queue past maxAttempts.
    for (let i = 0; i < 5; i++) await markFailed(first.id);
    const poisoned = (await list()).find((e) => e.id === first.id)!;
    expect(poisoned.dead).toBe(true);

    const attempted: string[] = [];
    const result = await flush(async (e) => {
      attempted.push(e.path);
      return true;
    });

    expect(attempted).toEqual(['/notifications/read']);
    expect(result).toEqual({ sent: 1, failed: 0, skipped: 1 });
    // The good entry was sent; the poisoned one stays (for an operator) but dead.
    const remaining = await list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].dead).toBe(true);
    await markSent(second.id);
  });

  it('replays in enqueue order', async () => {
    await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: '1' } });
    await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: '2' } });
    const order: number[] = [];
    await flush(async (e) => {
      order.push((e.body as any).id);
      return true;
    });
    expect(order).toEqual([1, 2]);
  });

  it('records a failed attempt and reports it', async () => {
    const entry = await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read' });
    const after = await markFailed(entry.id);
    expect(after?.attempts).toBe(1);
    expect(after?.dead).toBe(false);

    const result = await flush(async () => false);
    expect(result.failed).toBe(1);
  });

  it('clears everything on logout so the next account cannot replay it', async () => {
    // Defect (4): entries survived logout and were replayed under the next
    // account's token.
    await enqueue({ kind: 'notification.mark_read', method: 'POST', path: '/notifications/read', body: { id: 'n1' } });
    expect(await list()).toHaveLength(1);

    await clear();
    expect(await list()).toHaveLength(0);
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).toBeNull();
  });

  it('treats a corrupt store as empty rather than throwing', async () => {
    await AsyncStorage.setItem(KEY, '{not json');
    await expect(list()).resolves.toEqual([]);
  });
});