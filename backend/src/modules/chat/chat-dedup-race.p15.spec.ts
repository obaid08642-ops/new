/**
 * F8 — chat rapid-tap race (mocked models, no mongod here).
 *
 * sendMessage deduped client_message_id via findOne-then-insert: under a
 * barrier start both racers miss the read, both insert, and the loser ate a
 * raw E11000 (500). The schema already carries a UNIQUE sparse index on
 * client_message_id, so exactly one insert can win — the fix catches the
 * loser's 11000 and returns the winner (same protocol as the payments
 * 11000-loser-shares-winner path).
 *
 * The findOne mock barriers the two pre-check reads (both must be in flight
 * before either returns null) so the race is real, not sequential. The
 * create mock enforces winner-takes-all like the unique index does.
 *
 * Mutating production (e.g. checking `e?.code === 'NEVER'`) makes the loser
 * reject with the raw duplicate error → red.
 */
import { ChatService } from './chat.service';

const THREAD = { id: 'thread-1', participant_ids: ['patient-1', 'doctor-1'], unread_counts: {} };

function dupKey(): any {
  const err: any = new Error('E11000 duplicate key error collection: chat_messages index: client_message_id_1');
  err.code = 11000;
  return err;
}

describe('F8 rapid-tap dedup is atomic (mocked)', () => {
  it('two barrier-started sends with one client_message_id yield one row, one shared winner', async () => {
    const rows: any[] = [];
    let creates = 0;
    let arrived = 0;
    let releaseGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      releaseGate = r;
    });
    const threads: any = {
      findOne: jest.fn(async () => ({ ...THREAD })),
      updateOne: jest.fn(async () => ({})),
    };
    const msgs: any = {
      findOne: jest.fn(async () => {
        if (rows.length) {
          const w = rows[0];
          return { ...w, toObject: () => ({ ...w }) };
        }
        arrived += 1;
        if (arrived >= 2) releaseGate();
        else await gate;
        return null;
      }),
      create: jest.fn(async (doc: any) => {
        creates += 1;
        if (creates > 1) throw dupKey();
        const row = { id: 'msg-1', ...doc };
        rows.push(row);
        return { ...row, toObject: () => ({ ...row }) };
      }),
    };
    const svc = new ChatService(threads, msgs, { emit: jest.fn().mockResolvedValue(undefined) } as any, { emit: jest.fn() } as any);

    const payload = { body: 'hello', client_message_id: 'tap-1' };
    const settled = await Promise.allSettled([
      svc.sendMessage(THREAD.id, 'patient-1', 'patient', { ...payload }),
      svc.sendMessage(THREAD.id, 'patient-1', 'patient', { ...payload }),
    ]);

    expect(rows).toHaveLength(1); // exactly one message row
    const won = settled.filter((s) => s.status === 'fulfilled') as Array<{ value: any }>;
    expect(won).toHaveLength(2); // ...and NO 500: loser shares the winner
    expect(won[0].value.id).toBe('msg-1');
    expect(won[1].value.id).toBe('msg-1');
    // Only the winner runs the post-create path (thread metadata once).
    expect(threads.updateOne).toHaveBeenCalledTimes(1);
  });

  it('distinct client_message_ids still persist as distinct rows', async () => {
    const rows: any[] = [];
    const threads: any = {
      findOne: jest.fn(async () => ({ ...THREAD })),
      updateOne: jest.fn(async () => ({})),
    };
    const msgs: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn(async (doc: any) => {
        const row = { id: `msg-${rows.length + 1}`, ...doc };
        rows.push(row);
        return { ...row, toObject: () => ({ ...row }) };
      }),
    };
    const svc = new ChatService(threads, msgs, { emit: jest.fn().mockResolvedValue(undefined) } as any, { emit: jest.fn() } as any);

    const a = await svc.sendMessage(THREAD.id, 'patient-1', 'patient', { body: 'one', client_message_id: 'tap-a' });
    const b = await svc.sendMessage(THREAD.id, 'patient-1', 'patient', { body: 'two', client_message_id: 'tap-b' });
    expect(rows).toHaveLength(2);
    expect(a.id).not.toBe(b.id);
  });
});
