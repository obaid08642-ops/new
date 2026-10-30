/**
 * Chat message lifecycle: voice notes, delivered at send, tick state, delete (me / all + window),
 * preview fix after delete, push only for offline recipients, rate limits on the write routes.
 */
import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatService, VOICE_MAX_SECONDS } from './chat.service';
import { ChatController } from './chat.module';
import { USER_RATE_LIMIT_KEY } from '../../common/user-rate-limit';
import { PushService } from '../push/push.module';

const THREAD = { id: 't1', participant_ids: ['p1', 'd1'], unread_counts: {}, type: 'direct' };

function setup(opts: { online?: string[]; msg?: any; last?: any } = {}) {
  const created: any[] = [];
  const msgUpdates: any[] = [];
  const threadUpdates: any[] = [];
  const emitted: any[] = [];
  const msgDoc = opts.msg ? { save: jest.fn(async () => undefined), ...opts.msg } : null;
  const msgs: any = {
    findOne: jest.fn((f: any) => {
      if (f && f.thread_id && f.is_deleted === false) return { sort: () => ({ lean: async () => opts.last ?? null }) };
      return Promise.resolve(msgDoc);
    }),
    create: jest.fn(async (d: any) => { const row = { id: 'm1', ...d, toObject: () => ({ id: 'm1', ...d }) }; created.push(row); return row; }),
    updateOne: jest.fn(async (...a: any[]) => { msgUpdates.push(a); return {}; }),
    updateMany: jest.fn(async () => ({})),
  };
  const threads: any = {
    findOne: jest.fn(async () => ({ ...THREAD })),
    updateOne: jest.fn(async (...a: any[]) => { threadUpdates.push(a); return {}; }),
  };
  const events: any = { emit: jest.fn((n: string, p: any) => { emitted.push([n, p]); }) };
  const presence: any = { isOnline: jest.fn(async (id: string) => (opts.online || []).includes(id)) };
  const svc = new ChatService(threads, msgs, { emit: jest.fn().mockResolvedValue(undefined) } as any, events, undefined, presence);
  jest.spyOn(svc as any, 'verifyCommunicationAllowed').mockResolvedValue({ allowed: true });
  jest.spyOn(svc as any, 'validateChatMediaIds').mockImplementation(async (_t: any, _s: any, ids: any) => ids || []);
  return { svc, created, msgUpdates, threadUpdates, emitted, msgDoc };
}

describe('voice notes', () => {
  it('needs exactly one recording and a duration within the cap', async () => {
    const { svc } = setup();
    await expect(svc.sendMessage('t1', 'p1', 'patient', { type: 'voice', body: 'x' })).rejects.toThrow('voice_requires_one_media');
    await expect(svc.sendMessage('t1', 'p1', 'patient', { type: 'voice', media_ids: ['a'] })).rejects.toThrow('voice_duration_invalid');
    await expect(svc.sendMessage('t1', 'p1', 'patient', { type: 'voice', media_ids: ['a'], duration_seconds: VOICE_MAX_SECONDS + 1 })).rejects.toThrow('voice_duration_invalid');
    const { svc: ok, created } = setup();
    await ok.sendMessage('t1', 'p1', 'patient', { type: 'voice', media_ids: ['a'], duration_seconds: 12 });
    expect(created[0].type).toBe('voice');
  });
});

describe('delivered at send and offline push list', () => {
  it('marks online recipients delivered and lists only offline ones for push', async () => {
    const { svc, msgUpdates, emitted } = setup({ online: ['d1'] });
    await svc.sendMessage('t1', 'p1', 'patient', { body: 'hi' });
    expect(msgUpdates[0][1]).toEqual({ $addToSet: { delivered_to: { $each: ['d1'] } } });
    const sent = emitted.find(([n]) => n === 'chat.message_sent')![1];
    expect(sent.meta.offline_ids).toEqual([]);
  });
  it('an offline recipient stays in offline_ids and nothing is marked delivered', async () => {
    const { svc, msgUpdates, emitted } = setup({ online: [] });
    await svc.sendMessage('t1', 'p1', 'patient', { body: 'hi' });
    expect(msgUpdates).toHaveLength(0);
    expect(emitted.find(([n]) => n === 'chat.message_sent')![1].meta.offline_ids).toEqual(['d1']);
  });
  it('tick state: sent < delivered < read', () => {
    const m = { sender_id: 'p1', delivered_to: ['p1'], read_by: ['p1'] };
    expect(ChatService.statusFor(m, THREAD.participant_ids)).toBe('sent');
    expect(ChatService.statusFor({ ...m, delivered_to: ['p1', 'd1'] }, THREAD.participant_ids)).toBe('delivered');
    expect(ChatService.statusFor({ ...m, delivered_to: ['p1', 'd1'], read_by: ['p1', 'd1'] }, THREAD.participant_ids)).toBe('read');
  });
});

describe('delete', () => {
  const fresh = () => ({ id: 'm1', thread_id: 't1', sender_id: 'p1', body: 'secret', media_ids: [], createdAt: new Date() });
  it('for everyone inside the window: blanks, fixes the preview, tells the others', async () => {
    const { svc, msgDoc, threadUpdates, emitted } = setup({ msg: fresh(), last: { body: 'earlier', sender_id: 'd1', createdAt: new Date(1) } });
    await svc.deleteMessage('m1', 'p1', 'all');
    expect(msgDoc!.body).toBe('');
    expect(msgDoc!.is_deleted).toBe(true);
    expect(threadUpdates[0][1].$set.last_message).toBe('earlier');
    expect(emitted.find(([n]) => n === 'chatstate.deleted')![1]).toMatchObject({ kind: 'deleted', thread_id: 't1', msg_id: 'm1', participant_ids: ['p1', 'd1'] });
  });
  it('empties the preview when nothing is left', async () => {
    const { svc, threadUpdates } = setup({ msg: fresh(), last: null });
    await svc.deleteMessage('m1', 'p1');
    expect(threadUpdates[0][1].$set).toEqual({ last_message: '' });
  });
  it('after the window: delete_window_passed', async () => {
    const old = { ...fresh(), createdAt: new Date(Date.now() - 3 * 3600_000) };
    const { svc } = setup({ msg: old });
    await expect(svc.deleteMessage('m1', 'p1', 'all')).rejects.toThrow(BadRequestException);
    await expect(svc.deleteMessage('m1', 'p1', 'all')).rejects.toThrow('delete_window_passed');
  });
  it('only the sender deletes for everyone, any participant deletes for me', async () => {
    const { svc, msgUpdates } = setup({ msg: fresh() });
    await expect(svc.deleteMessage('m1', 'd1', 'all')).rejects.toThrow(ForbiddenException);
    await svc.deleteMessage('m1', 'd1', 'me');
    expect(msgUpdates[0][1]).toEqual({ $addToSet: { deleted_for: 'd1' } });
  });
});

describe('push for chat', () => {
  it('queues pushes only for recipients that are offline', async () => {
    const svc: any = Object.create(PushService.prototype);
    svc.queueNotification = jest.fn(async () => undefined);
    await svc.onChatMessage({ actor_account_id: 'p1', meta: { thread_id: 't1', participant_ids: ['p1', 'd1', 'x1'], offline_ids: ['x1'], body: 'hi' } });
    expect(svc.queueNotification.mock.calls.map((c: any[]) => c[0])).toEqual(['x1']);
  });
  it('without offline_ids (other producers) every recipient still gets one', async () => {
    const svc: any = Object.create(PushService.prototype);
    svc.queueNotification = jest.fn(async () => undefined);
    await svc.onChatMessage({ actor_account_id: 'p1', meta: { thread_id: 't1', participant_ids: ['p1', 'd1'], body: 'hi' } });
    expect(svc.queueNotification.mock.calls.map((c: any[]) => c[0])).toEqual(['d1']);
  });
});

describe('rate limits', () => {
  it.each(['sendMessage', 'editMessage', 'deleteMessage', 'addReaction'])('%s is limited per user', (name) => {
    const spec = Reflect.getMetadata(USER_RATE_LIMIT_KEY, (ChatController.prototype as any)[name]);
    expect(spec).toMatchObject({ limit: expect.any(Number), windowSeconds: 60 });
  });
});
