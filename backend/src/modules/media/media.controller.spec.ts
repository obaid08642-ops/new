import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { MediaController } from './media.controller';
import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

describe('MediaController authorization contract', () => {
  const reflector = new Reflector();

  it('restricts DELETE /media/*key to platform admins only (P1 regression guard)', () => {
    const roles = reflector.getAllAndOverride<Array<UserRole | string>>(ROLES_KEY, [
      MediaController.prototype.deleteFile,
      MediaController,
    ]);
    // Must be explicitly role-restricted: any authenticated user (e.g. a
    // patient) must NOT be able to delete arbitrary R2 objects by key.
    expect(roles).toBeDefined();
    expect(roles).toEqual(expect.arrayContaining([UserRole.ADMIN, UserRole.SUPER_ADMIN]));
    expect(roles).not.toContain(UserRole.PATIENT);
    expect(roles).not.toContain(UserRole.DOCTOR);
  });
});
