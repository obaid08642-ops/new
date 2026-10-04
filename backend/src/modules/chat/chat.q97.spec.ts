// Q97 (Round 11): group chat bypassed the LJ-06 "existing relationship" rule:
// a stranger could put anyone in a group, add anyone later, and add or remove
// people on a direct thread.
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';

function serviceFor(related: Record<string, string[]>, thread?: Record<string, unknown>) {
  const service = Object.create(ChatService.prototype) as ChatService & Record<string, unknown>;
  const threads = {
    findOne: jest.fn().mockResolvedValue(thread ?? null),
    create: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => ({ ...doc, toObject: () => doc })),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  Object.assign(service, {
    threads,
    hasDirectRelationship: jest.fn(async (a: string, b: string) => (related[a] || []).includes(b) || (related[b] || []).includes(a)),
  });
  return { service, threads };
}

describe('group chat follows the relationship rule (Q97)', () => {
  it('a group with a stranger is refused', async () => {
    const { service, threads } = serviceFor({ 'pat-A': ['doc-1'] });
    await expect(service.createGroupThread('pat-A', 'g', ['doc-1', 'stranger'])).rejects.toBeInstanceOf(ForbiddenException);
    expect(threads.create).not.toHaveBeenCalled();
  });

  it('a group of related people (family, own providers) is created', async () => {
    const { service, threads } = serviceFor({ 'pat-A': ['mother', 'doc-1'] });
    await service.createGroupThread('pat-A', 'family', ['mother', 'doc-1']);
    expect(threads.create).toHaveBeenCalledTimes(1);
  });

  it('adding a stranger to a group is refused; adding a related person works', async () => {
    const group = { id: 't1', type: 'group', participant_ids: ['pat-A', 'mother'] };
    const { service, threads } = serviceFor({ 'pat-A': ['doc-1'] }, group);
    await expect(service.addParticipant('t1', 'pat-A', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    expect(threads.updateOne).not.toHaveBeenCalled();
    await service.addParticipant('t1', 'pat-A', 'doc-1');
    expect(threads.updateOne).toHaveBeenCalledTimes(1);
  });

  it('a direct thread allows no participant changes', async () => {
    const direct = { id: 't2', type: 'direct', participant_ids: ['pat-A', 'doc-1'] };
    const { service, threads } = serviceFor({ 'pat-A': ['doc-2'] }, direct);
    await expect(service.addParticipant('t2', 'pat-A', 'doc-2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.removeParticipant('t2', 'pat-A', 'doc-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(threads.updateOne).not.toHaveBeenCalled();
  });
});
