import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { FamilyService } from './family.service';

// OC-C C-8: relation codes, grant aliases, display-name backfill.
function serviceFor(groupDoc: any) {
  let service: FamilyService;
  const groupModel: any = {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(groupDoc) }),
    create: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
  };
  const users: any[] = [{ id: 'user-1', full_name: 'الأب' }];
  const connection: any = {
    model: jest.fn().mockReturnValue({ findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    db: {
      collection: jest.fn(() => ({
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(users) }),
      })),
    },
  };
  return { groupModel, connection, get: async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: getConnectionToken(), useValue: connection },
        { provide: 'FamilyGroupRepository', useValue: groupModel },
        { provide: 'SharedCalendarEventRepository', useValue: {} },
        { provide: 'FamilyPermissionRequestRepository', useValue: {} },
      ],
    }).compile();
    service = module.get<FamilyService>(FamilyService);
    return service;
  } };
}

const OPEN_GROUP = { id: 'grp-1', owner_id: 'user-1', members: [], invite_expires_at: new Date(Date.now() + 3600000) };

describe('OC C-8 family codes and names', () => {
  it('stores a relation_code on join and rejects an unknown one', async () => {
    const { groupModel, get } = serviceFor(OPEN_GROUP);
    const service = await get();
    await service.joinGroup('user-2', 'ABC123', 'سارة', undefined, 'spouse');
    const pushed = groupModel.updateOne.mock.calls[0][1].$push.members;
    expect(pushed.relation_code).toBe('spouse');
    await expect(service.joinGroup('user-3', 'ABC123', 'x', undefined, 'cousin-twice')).rejects.toMatchObject({ response: { message: 'relation_invalid' } });
  });

  it('stores a relation_code on relation update', async () => {
    const { groupModel, get } = serviceFor({ id: 'grp-1', owner_id: 'user-1' });
    const service = await get();
    await service.updateMemberRelation('user-1', 'user-2', undefined, 'parent');
    expect(groupModel.updateOne.mock.calls[0][1].$set['members.$.relation_code']).toBe('parent');
  });

  it('expands legacy grant aliases to canonical keys', async () => {
    const { groupModel, get } = serviceFor({ id: 'grp-1', owner_id: 'user-1' });
    const service = await get();
    await expect(service.setMemberPermissions('user-1', 'user-2', ['view_prescriptions'])).resolves.toEqual({ ok: true, permissions: ['meds'] });
    await expect(service.setMemberPermissions('user-1', 'user-2', ['view_health'])).resolves.toEqual({ ok: true, permissions: ['vitals', 'meds', 'reports'] });
  });

  it('backfills member display_name from the user profile', async () => {
    const { get } = serviceFor({ id: 'grp-1', owner_id: 'user-1', members: [{ user_id: 'user-1', role: 'owner', permissions: ['*'] }] });
    const service = await get();
    const rows: any[] = await service.listMembers('user-1');
    expect(rows[0].display_name).toBe('الأب');
  });
});
