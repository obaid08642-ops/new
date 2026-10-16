import { ForbiddenException } from '@nestjs/common';
import { isAdminUser } from './enums';
import { LabsService } from '../modules/labs/labs.service';
import { RadiologyOpsService } from '../modules/radiology/radiology.service';
import { HomeCareSvc } from '../modules/home-care/home-care.service';

/** Walkthrough D1: a super admin must read the lab, radiology and nursing admin catalogues like an admin does
 *  (the controllers' @Roles(ADMIN) already let super_admin in; the services refused it). */
describe('admin catalogue is open to admin and super_admin only', () => {
  const rows = [{ id: 'c1' }];
  const model = () => ({ find: jest.fn().mockReturnValue({ sort: () => ({ limit: () => Promise.resolve(rows) }) }) });
  const services: Array<[string, { adminCatalog(u: unknown): Promise<unknown> }]> = [
    ['labs', Object.assign(Object.create(LabsService.prototype), { svcModel: model() })],
    ['radiology', Object.assign(Object.create(RadiologyOpsService.prototype), { svcModel: model() })],
    ['nursing', Object.assign(Object.create(HomeCareSvc.prototype), { svcModel: model() })],
  ];

  it('isAdminUser accepts admin and super_admin, nothing else', () => {
    expect(isAdminUser({ role: 'admin' })).toBe(true);
    expect(isAdminUser({ role: 'super_admin' })).toBe(true);
    for (const role of ['patient', 'lab', 'pharmacy', 'provider', '', undefined]) expect(isAdminUser({ role })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });

  it.each(services)('%s: admin and super_admin read the catalogue', async (_name, svc) => {
    await expect(svc.adminCatalog({ id: 'a', role: 'admin' })).resolves.toEqual(rows);
    await expect(svc.adminCatalog({ id: 's', role: 'super_admin' })).resolves.toEqual(rows);
  });

  it.each(services)('%s: a provider or patient is refused', async (_name, svc) => {
    await expect(svc.adminCatalog({ id: 'p', role: 'lab' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.adminCatalog({ id: 'u', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
