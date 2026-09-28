import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';

function serviceFor(opts: { family?: boolean; booking?: boolean } = {}) {
  const service: any = Object.create(ChatService.prototype);
  const created: any[] = [];
  service.threads = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return { ...doc, toObject: () => doc }; }),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  service.checkIfFamily = jest.fn().mockResolvedValue(!!opts.family);
  service.getModel = jest.fn().mockReturnValue({ countDocuments: jest.fn().mockResolvedValue(opts.booking ? 1 : 0) });
  service.logger = { warn: jest.fn() };
  return { service, created };
}

describe('Chat direct-thread restriction (LJ-06)', () => {
  it('opens a direct thread when a booking relation exists', async () => {
    const { service } = serviceFor({ booking: true });
    const thread = await service.getOrCreateDirectThread('patient-1', 'doctor-1');
    expect(thread.type).toBe('direct');
    expect(service.threads.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'direct', participant_ids: ['doctor-1', 'patient-1'],
    }));
  });

  it('opens a direct thread for family members without a booking', async () => {
    const { service } = serviceFor({ family: true });
    await expect(service.getOrCreateDirectThread('member-a', 'member-b')).resolves.toMatchObject({ type: 'direct' });
  });

  it('refuses a direct thread to a stranger with no booking relationship', async () => {
    const { service } = serviceFor({});
    await expect(service.getOrCreateDirectThread('patient-1', 'stranger-2'))
      .rejects.toThrow(new ForbiddenException('direct_chat_requires_existing_relationship'));
    expect(service.threads.create).not.toHaveBeenCalled();
  });

  it('rejects messaging yourself or an empty recipient', async () => {
    const { service } = serviceFor({ booking: true });
    await expect(service.getOrCreateDirectThread('u-1', 'u-1')).rejects.toThrow(BadRequestException);
    await expect(service.getOrCreateDirectThread('u-1', '')).rejects.toThrow(BadRequestException);
  });
});
