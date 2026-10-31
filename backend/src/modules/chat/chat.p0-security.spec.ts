import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService, bookingKindSpellings, canonicalBookingKind, isConsultationThread } from './chat.service';

const q = (v: any) => ({ lean: jest.fn().mockResolvedValue(v) });

function service(over: Record<string, any> = {}) {
  const s: any = Object.create(ChatService.prototype);
  s.logger = { warn: jest.fn(), log: jest.fn() };
  s.threads = { findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };
  s.msgs = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'm1', toObject: () => ({ id: 'm1' }) }), updateMany: jest.fn() };
  s.bus = { emit: jest.fn().mockResolvedValue(undefined) };
  s.events = { emit: jest.fn() };
  Object.assign(s, over);
  return s;
}

describe('chat P0: participant management', () => {
  const direct = { id: 't', type: 'direct', created_by: 'a', participant_ids: ['a', 'b'] };
  const group = { id: 'g', type: 'group', created_by: 'a', participant_ids: ['a', 'b', 'c'] };

  it('a direct thread cannot gain or lose members', async () => {
    const s = service();
    s.threads.findOne.mockResolvedValue(direct);
    await expect(s.addParticipant('t', 'a', 'x')).rejects.toThrow(ForbiddenException);
    await expect(s.removeParticipant('t', 'a', 'b')).rejects.toThrow(ForbiddenException);
    expect(s.threads.updateOne).not.toHaveBeenCalled();
  });

  it('only the creator of a group adds or removes others; a member may leave', async () => {
    const s = service();
    s.threads.findOne.mockResolvedValue(group);
    await expect(s.addParticipant('g', 'b', 'x')).rejects.toThrow(ForbiddenException);
    await expect(s.removeParticipant('g', 'b', 'c')).rejects.toThrow(ForbiddenException);
    expect(s.threads.updateOne).not.toHaveBeenCalled();
    await s.removeParticipant('g', 'b', 'b');
    await s.addParticipant('g', 'a', 'x');
    expect(s.threads.updateOne).toHaveBeenCalledTimes(2);
  });
});

describe('chat P0: booking kind', () => {
  it('canonicalises the alias and rejects an unknown kind', () => {
    expect(canonicalBookingKind('Doctor')).toBe('consultation');
    expect(canonicalBookingKind(' consultation ')).toBe('consultation');
    expect(canonicalBookingKind('whatever')).toBeNull();
    expect(bookingKindSpellings('consultation')).toContain('doctor');
  });

  it('a legacy doctor thread is still a windowed consultation thread', () => {
    expect(isConsultationThread({ type: 'booking', booking_kind: 'doctor' })).toBe(true);
    expect(isConsultationThread({ type: 'booking', booking_kind: 'lab' })).toBe(false);
  });

  it('refuses a booking thread for a kind that does not exist, and stores the canonical kind', async () => {
    const s = service();
    await expect(s.getOrCreateBookingThread('nonsense', 'b1', 'p1')).rejects.toThrow(BadRequestException);
    s.resolveBookingParties = jest.fn().mockResolvedValue({ patientId: 'p1', providerId: 'd1' });
    s.threads.findOne.mockResolvedValue(null);
    s.threads.create.mockResolvedValue({ toObject: () => ({}) });
    await s.getOrCreateBookingThread('Doctor', 'b1', 'p1');
    expect(s.resolveBookingParties).toHaveBeenCalledWith('consultation', 'b1');
    expect(s.threads.create).toHaveBeenCalledWith(expect.objectContaining({ booking_kind: 'consultation' }));
  });
});

describe('chat P0: consultation window', () => {
  const thread = { id: 't', type: 'booking', booking_kind: 'doctor', booking_id: 'a1', participant_ids: ['p', 'd'] };
  const base = () => {
    const s = service();
    s.threads.findOne.mockResolvedValue(thread);
    s.checkIfFamily = jest.fn().mockResolvedValue(false);
    return s;
  };

  it('fails closed when the window cannot be computed', async () => {
    const s = base();
    s.consultationThreadState = jest.fn().mockRejectedValue(new Error('db down'));
    await expect(s.verifyCommunicationAllowed('t', 'p')).resolves.toEqual(expect.objectContaining({ allowed: false }));
  });

  it('applies the window to a thread stored with the doctor alias', async () => {
    const s = base();
    s.consultationThreadState = jest.fn().mockResolvedValue({ state: { phase: 'upcoming', online: true, can_chat: false } });
    await expect(s.verifyCommunicationAllowed('t', 'p')).resolves.toEqual(expect.objectContaining({ allowed: false }));
  });

  it('blocks voice by what is attached, whatever type the client sends', async () => {
    const s = base();
    s.consultationThreadState = jest.fn().mockResolvedValue({ state: { phase: 'follow_up', online: false, can_chat: true, can_voice: false } });
    s.threads.findOne.mockResolvedValue(thread);
    s.assertParticipant = jest.fn();
    s.getModel = jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue(q([{ id: 'm', owner_id: 'p', purpose: 'chat', thread_id: 't', mime_type: 'audio/webm' }])) });
    await expect(s.sendMessage('t', 'p', 'patient', { body: 'x', type: 'file', media_ids: ['m'] })).rejects.toThrow(ForbiddenException);
    expect(s.msgs.create).not.toHaveBeenCalled();
  });
});

describe('chat P0: attachments must be scanned', () => {
  const mk = (asset: any) => {
    const s = service();
    s.threads.findOne.mockResolvedValue({ id: 't', participant_ids: ['p'] });
    s.verifyCommunicationAllowed = jest.fn().mockResolvedValue({ allowed: true });
    s.getModel = jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue(q([{ id: 'm', owner_id: 'p', purpose: 'chat', thread_id: 't', key: 'k', ...asset }])) });
    return s;
  };

  it.each([['pending_scan'], ['scanning']])('refuses a file with scan_status %s (423)', async (scan_status) => {
    const s = mk({ scan_status });
    await expect(s.sendMessage('t', 'p', 'patient', { media_ids: ['m'] })).rejects.toMatchObject({ status: 423 });
    expect(s.msgs.create).not.toHaveBeenCalled();
  });

  it('refuses a file still under the pending/ prefix and an infected one', async () => {
    await expect(mk({ key: 'pending/k' }).sendMessage('t', 'p', 'patient', { media_ids: ['m'] })).rejects.toMatchObject({ status: 423 });
    await expect(mk({ scan_status: 'infected' }).sendMessage('t', 'p', 'patient', { media_ids: ['m'] })).rejects.toThrow(BadRequestException);
  });

  it('accepts a clean file', async () => {
    const s = mk({ scan_status: 'clean', mime_type: 'image/png' });
    await expect(s.sendMessage('t', 'p', 'patient', { media_ids: ['m'] })).resolves.toBeDefined();
  });
});

describe('chat P0: socket relay', () => {
  const sock = (rooms: string[]) => ({ id: 's', rooms: new Set(rooms), to: jest.fn().mockReturnValue({ emit: jest.fn() }) }) as any;
  const gw = (chat: any) => {
    const g = new ChatGateway(chat);
    (g as any).activeUsers.set('s', 'u1');
    return g;
  };

  it('send_message relays nothing for a socket that never joined the thread', async () => {
    const chat = { getThread: jest.fn(), verifyCommunicationAllowed: jest.fn() };
    const socket = sock([]);
    await expect(gw(chat).handleSendMessage(socket, { threadId: 'foreign', content: 'hi' })).resolves.toEqual({ error: 'not_participant' });
    expect(socket.to).not.toHaveBeenCalled();
  });

  it('send_message ignores a client state and asks the server for the window', async () => {
    const chat = { getThread: jest.fn().mockResolvedValue({}), verifyCommunicationAllowed: jest.fn().mockResolvedValue({ allowed: false }) };
    const socket = sock(['thread_t']);
    await expect(gw(chat).handleSendMessage(socket, { threadId: 't', content: 'hi', state: 'ACTIVE' } as any)).resolves.toEqual({ error: 'chat_not_allowed' });
    expect(socket.to).not.toHaveBeenCalled();
  });

  it('typing, calls and receipts need the joined room too', async () => {
    const chat = { getThread: jest.fn(), consultationThreadState: jest.fn() };
    const g = gw(chat);
    const socket = sock([]);
    await expect(g.handleTyping(socket, { threadId: 't', isTyping: true })).resolves.toEqual({ error: 'not_participant' });
    await expect(g.handleInitiateCall(socket, { threadId: 't' })).resolves.toEqual({ error: 'not_participant' });
    await expect(g.handleMarkSeen(socket, { threadId: 't' })).resolves.toEqual({ error: 'not_participant' });
    expect(socket.to).not.toHaveBeenCalled();
  });
});
