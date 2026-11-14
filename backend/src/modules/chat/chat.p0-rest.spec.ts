import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { consultationState, followUpEnd } from './consultation-window';

function service() {
  const s: any = Object.create(ChatService.prototype);
  s.logger = { warn: jest.fn(), log: jest.fn() };
  s.threads = { findOne: jest.fn().mockResolvedValue({ id: 't', participant_ids: ['p', 'd'], unread_counts: {} }), updateOne: jest.fn().mockResolvedValue({}) };
  s.msgs = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'm1', type: 'text', toObject: () => ({ id: 'm1' }) }), updateOne: jest.fn() };
  s.bus = { emit: jest.fn().mockResolvedValue(undefined) };
  s.events = { emit: jest.fn() };
  s.verifyCommunicationAllowed = jest.fn().mockResolvedValue({ allowed: true });
  return s;
}

describe('chat: message events', () => {
  it('emits chat.message_sent once, with the whole body (not cut at 120)', async () => {
    const s = service();
    const long = 'x'.repeat(1500);
    await s.sendMessage('t', 'p', 'patient', { body: long });
    expect(s.bus.emit).toHaveBeenCalledTimes(1);
    expect(s.events.emit).not.toHaveBeenCalled();
    expect(s.bus.emit.mock.calls[0][0].meta.body).toHaveLength(1500);
  });

  it('falls back to the in-process event once only when the bus fails', async () => {
    const s = service();
    s.bus.emit.mockRejectedValue(new Error('bus down'));
    await s.sendMessage('t', 'p', 'patient', { body: 'hi' });
    await new Promise((r) => setImmediate(r));
    expect(s.events.emit).toHaveBeenCalledTimes(1);
    expect(s.events.emit).toHaveBeenCalledWith('chat.message_sent', expect.objectContaining({ meta: expect.objectContaining({ body: 'hi' }) }));
  });

  it('refuses a client-sent system or unknown message type', async () => {
    const s = service();
    await expect(s.sendMessage('t', 'p', 'patient', { body: 'x', type: 'system' })).rejects.toThrow(BadRequestException);
    await expect(s.sendMessage('t', 'p', 'patient', { body: 'x', type: 'banana' })).rejects.toThrow(BadRequestException);
    expect(s.msgs.create).not.toHaveBeenCalled();
  });
});

describe('chat: editMessage', () => {
  it('applies the thread window to an edit', async () => {
    const s = service();
    const save = jest.fn();
    s.msgs.findOne.mockResolvedValue({ id: 'm', thread_id: 't', sender_id: 'p', is_deleted: false, save, toObject: () => ({}) });
    s.verifyCommunicationAllowed.mockResolvedValue({ allowed: false, message: 'closed' });
    await expect(s.editMessage('m', 'p', 'new')).rejects.toThrow(ForbiddenException);
    expect(save).not.toHaveBeenCalled();
  });

  it('a sender removed from the thread cannot edit', async () => {
    const s = service();
    s.msgs.findOne.mockResolvedValue({ id: 'm', thread_id: 't', sender_id: 'gone', is_deleted: false, save: jest.fn() });
    await expect(s.editMessage('m', 'gone', 'new')).rejects.toBeDefined();
  });
});

describe('consultation window: completion time', () => {
  const done = new Date('2026-10-01T10:00:00Z');
  it('uses the COMPLETED history entry, not updatedAt, when completed_at is missing', () => {
    const appt = { status: 'COMPLETED', updatedAt: new Date('2026-10-20T00:00:00Z'), state_history: [{ state: 'CONFIRMED', at: new Date('2026-09-30T00:00:00Z') }, { state: 'COMPLETED', at: done }] };
    expect(followUpEnd(appt, null, 24).getTime()).toBe(done.getTime() + 24 * 3_600_000);
  });

  it('prefers completed_at, and an extension or a close still decide the state', () => {
    const appt = { status: 'COMPLETED', service_type: 'video', completed_at: done, updatedAt: new Date() };
    const now = done.getTime() + 30 * 3_600_000;
    expect(consultationState(appt, null, 24, now).can_upload).toBe(false);
    expect(consultationState(appt, { extended_until: new Date(done.getTime() + 48 * 3_600_000) }, 24, now).can_upload).toBe(true);
    expect(consultationState(appt, { closed_at: new Date(), extended_until: new Date(done.getTime() + 48 * 3_600_000) }, 24, now).can_upload).toBe(false);
  });
});
