// Q83: 49648b5 stacked a second @RequirePermissions above the existing one on
// the four RBAC write routes. The outer decorator overwrote the metadata, so
// assigning roles stopped requiring USER_EDIT. The guard reads exactly this
// metadata (auth.guard.ts, PERMISSIONS_KEY).
import 'reflect-metadata';
import { Permission, PERMISSIONS_KEY } from '../../../common/permissions';
import { AdminSecurityController } from './admin-security.controller';

const perms = (method: keyof AdminSecurityController) =>
  Reflect.getMetadata(PERMISSIONS_KEY, AdminSecurityController.prototype[method]) as Permission[];

describe('RBAC write routes keep their exact permissions (Q83)', () => {
  it('assigning user roles needs USER_EDIT and RBAC_MANAGE', () => {
    expect([...perms('assignUserRoles')].sort()).toEqual([Permission.RBAC_MANAGE, Permission.USER_EDIT].sort());
  });
  it.each(['createRole', 'updateRole', 'deleteRole'] as const)('%s needs RBAC_MANAGE', (m) => {
    expect(perms(m)).toEqual([Permission.RBAC_MANAGE]);
  });
});
