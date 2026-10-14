import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';

/**
 * Q92: GET /family/member-health/:userId returned the medical profile of ANY
 * patient to anyone who owns a family group. The target must be a member (or
 * the owner) of the requester's own group.
 */
describe('FamilyService.getMemberHealth only reads members of the requester group (Q92)', () => {
  let service: FamilyService;
  let profileFindOne: jest.Mock;
  const group = { id: 'grp-1', owner_id: 'owner-1', members: [{ user_id: 'member-1', permissions: ['vitals'] }] };

  beforeEach(async () => {
    profileFindOne = jest.fn((q: any) => ({ lean: jest.fn().mockResolvedValue({ patient_id: q.patient_id, allergies: [{ name: 'x' }] }) }));
    const groupModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(group) }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: getConnectionToken(), useValue: { model: jest.fn().mockReturnValue({ findOne: profileFindOne }) } },
        { provide: 'FamilyGroupRepository', useValue: groupModel },
        { provide: 'SharedCalendarEventRepository', useValue: {} },
        { provide: 'FamilyPermissionRequestRepository', useValue: {} },
      ],
    }).compile();
    service = module.get(FamilyService);
  });

  it('refuses a patient who is not in the requester group and never reads the profile', async () => {
    await expect(service.getMemberHealth('owner-1', 'stranger-9')).rejects.toThrow(NotFoundException);
    expect(profileFindOne).not.toHaveBeenCalled();
  });

  it('still returns the profile of a member of the group', async () => {
    const res: any = await service.getMemberHealth('owner-1', 'member-1');
    expect(res.patient_id).toBe('member-1');
  });

  it('a member with a health permission can read the group owner', async () => {
    const res: any = await service.getMemberHealth('member-1', 'owner-1');
    expect(res.patient_id).toBe('owner-1');
  });
});
