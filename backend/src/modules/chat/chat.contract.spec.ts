import { BadRequestException, NotFoundException } from '@nestjs/common';
import { REQUIRE_IDEMPOTENCY } from '../../common/idempotency.interceptor';
import { ChatController } from './chat.module';
import { ChatService } from './chat.service';

const USER = { id: 'patient-1', role: 'patient' };
const THREAD = { id: 'thread-1', participant_ids: ['patient-1', 'doctor-1'], unread_counts: {} };

function query(value: any) { return { lean: jest.fn().mockResolvedValue(value) }; }

function serviceFor() {
  const service: any = Object.create(ChatService.prototype);
  service.threads = {
    findOne: jest.fn().mockResolvedValue(THREAD),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  service.msgs = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'msg-1', type: 'file', toObject: () => ({ id: 'msg-1', type: 'file' }) }),
    updateMany: jest.fn().mockResolvedValue({}),
  };
  service.bus = { emit: jest.fn().mockResolvedValue(undefined) };
  service.events = { emit: jest.fn() };
  service.verifyCommunicationAllowed = jest.fn().mockResolvedValue({ allowed: true });
  service.getModel = jest.fn().mockReturnValue({
    find: jest.fn().mockReturnValue(query([{ id: 'media-1', owner_id: USER.id, purpose: 'chat', thread_id: THREAD.id }])),
  });
  return service;
}

describe('Chat patient-web contract bridge', () => {
  it('returns 404 rather than revealing a thread to a non-participant', async () => {
    const service = serviceFor();
    service.threads.findOne.mockReturnValue(query({ id: 'thread-1', participant_ids: ['patient-1'] }));

    await expect(service.getThread('thread-1', 'stranger-1')).rejects.toThrow(NotFoundException);
  });

  it('accepts only media assets owned by the sender and bound to the same chat thread', async () => {
    const service = serviceFor();

    await expect(service.sendMessage(THREAD.id, USER.id, 'patient', { body: 'see attachment', media_ids: ['media-1'] }))
      .resolves.toEqual({ id: 'msg-1', type: 'file' });

    expect(service.getModel).toHaveBeenCalledWith('MediaAsset');
    expect(service.msgs.create).toHaveBeenCalledWith(expect.objectContaining({
      thread_id: THREAD.id, sender_id: USER.id, media_ids: ['media-1'], attachment_url: undefined,
    }));
  });

  it('rejects foreign or cross-thread media before creating a message', async () => {
    const service = serviceFor();
    service.getModel.mockReturnValue({ find: jest.fn().mockReturnValue(query([])) });

    await expect(service.sendMessage(THREAD.id, USER.id, 'patient', { media_ids: ['foreign-media'] }))
      .rejects.toThrow(new BadRequestException('media_not_owned_or_not_bound_to_thread'));

    expect(service.msgs.create).not.toHaveBeenCalled();
  });

  it('rejects legacy public attachment URLs rather than persisting them', async () => {
    const service = serviceFor();

    await expect(service.sendMessage(THREAD.id, USER.id, 'patient', { body: 'unsafe', attachment_url: 'https://public.example/x' }))
      .rejects.toThrow(new BadRequestException('attachment_url_not_supported_use_media_ids'));

    expect(service.msgs.create).not.toHaveBeenCalled();
  });

  it('issues a thread-scoped realtime token for ten minutes only', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-chat-secret';
    try {
      const service = serviceFor();
      service.threads.findOne.mockReturnValue(query(THREAD));
      const issued = await service.issueRealtimeToken(THREAD.id, USER);
      const payload = JSON.parse(Buffer.from(issued.token.split('.')[1], 'base64url').toString('utf8'));
      expect(issued.expires_in).toBe(600);
      expect(payload.thread_id).toBe(THREAD.id);
      expect(payload.aud).toBe('chat-rt');
      expect(payload.exp - payload.iat).toBe(600);
    } finally {
      if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
    }
  });

  it('limits mark-read to the requested message marker when supplied', async () => {
    const service = serviceFor();
    service.msgs.findOne.mockReturnValue(query({ id: 'msg-9', thread_id: THREAD.id, createdAt: new Date('2030-01-01T00:00:00.000Z') }));

    await service.markRead(THREAD.id, USER.id, 'msg-9');

    expect(service.msgs.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: { $lte: new Date('2030-01-01T00:00:00.000Z') } }),
      { $addToSet: { read_by: USER.id } },
    );
  });

  it('requires idempotency on the message mutation endpoint', () => {
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, ChatController.prototype.sendMessage)).toBe(true);
  });
});
