/**
 * 15.2 — rapid tap on "send" must never surface a 500.
 *
 * `sendMessage` deduped `client_message_id` with a findOne-then-insert. Two
 * taps whose reads are both still in flight both miss the read, both insert,
 * and the loser ate a raw E11000 (a 500 for a message the patient can see in
 * the thread). The schema already carries a UNIQUE sparse index on
 * `client_message_id`, so exactly one insert can win: the fix catches the
 * loser's 11000 and returns the winner, the same protocol the payments path
 * already uses.
 *
 * The findOne double barriers the two pre-check reads (both must be in flight
 * before either answers null) so the race is real, not sequential. The create
 * double enforces winner-takes-all like the unique index does.
 */
import { ChatService } from './chat.service';

const THREAD = { id: 'thread-1', participant_ids: ['patient-1', 'doctor-1'], unread_counts: {} };

function dupKey(): any {
  const err: any = new Error('E11000 duplicate key error collection: chat_messages index: client_message_id_1');
  err.code = 11000;
  return err;
}

describe('15.2 rapid-tap dedup is atomic (mocked models)', () => {
  it('two barrier-started sends with one client_message_id yield one row and no error', async () => {
    const rows: any[] = [];
    let creates = 0;
    let arrived = 0;
    let releaseGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => { releaseGate = r; });
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

    expect(rows).toHaveLength(1);
    const rejected = settled.filter((s) => s.status === 'rejected');
    expect(rejected).toEqual([]);
    for (const s of settled as Array<{ value: any }>) {
      expect(s.value.id).toBe('msg-1');
    }
  });

  it('rethrows a non-duplicate insert error untouched', async () => {
    const boom: any = new Error('storage unavailable');
    const msgs: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn(async () => { throw boom; }),
    };
    const threads: any = { findOne: jest.fn(async () => ({ ...THREAD })), updateOne: jest.fn(async () => ({})) };
    const svc = new ChatService(threads, msgs, { emit: jest.fn().mockResolvedValue(undefined) } as any, { emit: jest.fn() } as any);

    await expect(
      svc.sendMessage(THREAD.id, 'patient-1', 'patient', { body: 'hi', client_message_id: 'k-boom' }),
    ).rejects.toBe(boom);
  });

  it('a duplicate belonging to another sender is not shared with this caller', async () => {
    // The re-read after E11000 must use the SAME sender-scoped filter, so a
    // message that merely shares a client_message_id across senders can never
    // be handed to the wrong caller.
    let calls = 0;
    const msgs: any = {
      findOne: jest.fn(async () => {
        calls += 1;
        return null;
      }),
      create: jest.fn(async () => { throw dupKey(); }),
    };
    const threads: any = { findOne: jest.fn(async () => ({ ...THREAD })), updateOne: jest.fn(async () => ({})) };
    const svc = new ChatService(threads, msgs, { emit: jest.fn().mockResolvedValue(undefined) } as any, { emit: jest.fn() } as any);

    await expect(
      svc.sendMessage(THREAD.id, 'patient-1', 'patient', { body: 'hi', client_message_id: 'shared-key' }),
    ).rejects.toThrow(/E11000/);
    // pre-check read + post-duplicate re-read, and the re-read still filtered.
    expect(calls).toBe(2);
    expect(msgs.findOne.mock.calls[1][0]).toMatchObject({ sender_id: { $eq: 'patient-1' } });
  });
});