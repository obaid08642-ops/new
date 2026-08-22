import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { FamilyService } from './family.service';

describe('FamilyService', () => {
  let service: FamilyService;
  let groupModel: any;
  let calendarModel: any;
  let permReqModel: any;

  beforeEach(async () => {
    groupModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    calendarModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    permReqModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: getConnectionToken(), useValue: { model: jest.fn().mockReturnValue({ findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }) } },
        { provide: 'FamilyGroupRepository', useValue: groupModel },
        { provide: 'SharedCalendarEventRepository', useValue: calendarModel },
        { provide: 'FamilyPermissionRequestRepository', useValue: permReqModel },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  describe('createGroup', () => {
    it('should create a new family group for a user', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      groupModel.create.mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', name: 'آل أحمد' });

      const result = await service.createGroup('user-1', 'آل أحمد');
      expect(result.ok).toBe(true);
      expect(result.name).toBe('آل أحمد');
    });

    it('should throw if user already belongs to a group', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'existing-group' }) });

      await expect(service.createGroup('user-1', 'آل أحمد')).rejects.toThrow(
        'User already belongs to a family group',
      );
    });
  });

  describe('generateInvite', () => {
    it('should generate an invite code for the group owner', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1' }) });
      groupModel.updateOne.mockResolvedValue({});

      const result = await service.generateInvite('user-1');
      expect(result.invite_code).toBeDefined();
      expect(result.expires_at).toBeInstanceOf(Date);
    });

    it('should throw if user is not a group owner', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await expect(service.generateInvite('user-2')).rejects.toThrow('You must be the group owner');
    });
  });

  describe('joinGroup', () => {
    it('should allow a new user to join via valid invite code', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'grp-1', owner_id: 'user-1', members: [], invite_expires_at: new Date(Date.now() + 3600000),
        }),
      });
      groupModel.updateOne.mockResolvedValue({});

      const result = await service.joinGroup('user-2', 'ABC123', 'سارة');
      expect(result.ok).toBe(true);
      expect(result.group_id).toBe('grp-1');
    });

    it('should throw on invalid or expired invite code', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await expect(service.joinGroup('user-2', 'INVALID')).rejects.toThrow('Invalid or expired invite code');
    });

    it('should throw if user is already a member', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'grp-1', owner_id: 'user-1',
          members: [{ user_id: 'user-2' }],
          invite_expires_at: new Date(Date.now() + 3600000),
        }),
      });
      await expect(service.joinGroup('user-2', 'ABC123')).rejects.toThrow('Already a member');
    });
  });

  describe('addCalendarEvent', () => {
    it('should create a calendar event for a group member', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', members: [{ user_id: 'user-1' }] }),
      });
      calendarModel.create.mockResolvedValue({ id: 'evt-1' });

      const result = await service.addCalendarEvent('user-1', {
        title: 'موعد طبيب الأطفال',
        type: 'appointment',
        event_date: new Date(),
        member_user_id: 'user-1',
      });
      expect(result.ok).toBe(true);
      expect(result.event_id).toBe('evt-1');
    });

    it('requires a real schedule and an existing group member instead of creating defaults', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', members: [{ user_id: 'user-2', display_name: 'سارة' }] }),
      });
      await expect(service.addCalendarEvent('user-1', { title: 'موعد', type: 'appointment', member_user_id: 'user-2' })).rejects.toThrow('event_date');
      await expect(service.addCalendarEvent('user-1', { title: 'موعد', type: 'appointment', event_date: new Date(), member_user_id: 'outside-group' })).rejects.toThrow('Member not found');
      expect(calendarModel.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteCalendarEvent', () => {
    it('rejects a group member deleting another member event and does not mutate it', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'owner-1', members: [{ user_id: 'member-1' }, { user_id: 'member-2' }] }) });
      calendarModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'evt-1', group_id: 'grp-1', created_by: 'member-1' }) });

      await expect(service.deleteCalendarEvent('member-2', 'evt-1')).rejects.toThrow('Only the event creator or group owner');
      expect(calendarModel.updateOne).not.toHaveBeenCalled();
    });

    it('permits the creator to delete their own event', async () => {
      groupModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'owner-1', members: [{ user_id: 'member-1' }] }) });
      calendarModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'evt-1', group_id: 'grp-1', created_by: 'member-1' }) });
      calendarModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await expect(service.deleteCalendarEvent('member-1', 'evt-1')).resolves.toEqual({ ok: true });
    });
  });

  describe('requestPermissions', () => {
    it('should create a permission request and emit event', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', members: [{ user_id: 'user-2', permissions: [] }] }),
      });
      permReqModel.create.mockResolvedValue({ id: 'req-1' });

      const result = await service.requestPermissions('user-2', 'user-3', ['view_health']);
      expect(result.ok).toBe(true);
      expect(result.request_id).toBe('req-1');
    });
  });

  describe('member permission update result handling', () => {
    it('does not convert a successful update with empty result metadata into a false 404', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', members: [{ user_id: 'user-2', permissions: [] }] }),
      });
      groupModel.updateOne.mockResolvedValue({});
      await expect(service.setMemberPermissions('user-1', 'user-2', ['vitals'])).resolves.toEqual({ ok: true, permissions: ['vitals'] });
    });

    it('keeps a real not-found result fail-closed', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1', members: [] }),
      });
      groupModel.updateOne.mockResolvedValue({ matchedCount: 0 });
      await expect(service.setMemberPermissions('user-1', 'user-2', ['vitals'])).rejects.toThrow('Member not found');
    });
  });

  describe('respondPermission', () => {
    it('should approve a permission request and grant permissions to requester', async () => {
      groupModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'grp-1', owner_id: 'user-1' }),
      });
      permReqModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          id: 'req-1', requester_id: 'user-2',
          requested_permissions: ['view_health'],
          group_id: 'grp-1',
        }),
      });
      permReqModel.updateOne.mockResolvedValue({});
      groupModel.updateOne.mockResolvedValue({});

      const result = await service.respondPermission('user-1', 'req-1', 'approved');
      expect(result.ok).toBe(true);
      expect(result.decision).toBe('approved');
      expect(groupModel.updateOne).toHaveBeenCalled();
    });
  });
});
