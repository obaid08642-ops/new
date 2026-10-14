// Q78: MedicinesController carries @Roles(ADMIN) at class level, so routes meant
// for patients and pharmacies inherited ADMIN: a patient got 403 'Insufficient
// role' on GET /medicines/me/recently-viewed (reproduced live), and recent
// searches and pharmacy shortage reports were admin-only too.
import 'reflect-metadata';
import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MedicinesController } from './medicines.controller';

const roles = (m: keyof MedicinesController) => Reflect.getMetadata(ROLES_KEY, MedicinesController.prototype[m]) as string[] | undefined;

describe('medicines routes for patients and pharmacies (Q78)', () => {
  it('recently viewed and recent searches are the patient\'s own lists', () => {
    expect(roles('recentlyViewed')).toEqual([UserRole.PATIENT]);
    expect(roles('recent')).toEqual([UserRole.PATIENT]);
  });
  it('a pharmacy can report a shortage', () => {
    expect(roles('reportShortage')).toEqual([UserRole.PHARMACY]);
  });
});
