import { ForbiddenException } from '@nestjs/common';
import { FamilyChatController } from './compat.module';

describe('FamilyChatController canonical membership', () => {
  let groups: any;
  let messages: any;
  let controller: FamilyChatController;

  beforeEach(() => {
    groups = { findOne: jest.fn() };
    messages = {
      find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })) })) })),
      insertOne: jest.fn(),
    };
    const conn: any = { collection: jest.fn((name: string) => name === 'family_groups' ? groups : messages) };
    controller = new FamilyChatController(conn);
  });

  it('rejects a user with no active canonical family membership before reading messages', async () => {
    groups.findOne.mockResolvedValue(null);
    await expect(controller.list({ id: 'removed-user' }, '50')).rejects.toThrow(ForbiddenException);
    expect(messages.find).not.toHaveBeenCalled();
  });

  it('uses the canonical group id for a member chat read and write', async () => {
    groups.findOne.mockResolvedValue({ id: 'group-1', owner_id: 'owner-1', members: [{ user_id: 'member-1' }] });

    await controller.list({ id: 'member-1' }, '50');
    expect(groups.findOne).toHaveBeenCalledWith(expect.objectContaining({
      is_deleted: { $ne: true },
      $or: [{ owner_id: 'member-1' }, { 'members.user_id': 'member-1' }],
    }));
    expect(messages.find).toHaveBeenCalledWith({ family_id: 'group-1' });

    await controller.send({ id: 'member-1', full_name: 'Member' }, { text: 'Hello family' });
    expect(messages.insertOne).toHaveBeenCalledWith(expect.objectContaining({
      family_id: 'group-1', sender_id: 'member-1', text: 'Hello family',
    }));
  });
});
