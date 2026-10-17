import { ForbiddenException } from '@nestjs/common';
import { Permission } from './permissions';
import { resolveEffectivePermissions, resolveStaffAccess } from './effective-permissions';
import { SupportSessionContextController } from './support-session-context.controller';

describe('effective support-session permissions', () => {
  function connectionWithRoles(roles: any[]) {
    const cursor: any = {
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(roles),
    };
    return {
      collection: jest.fn().mockReturnValue({ find: jest.fn().mockReturnValue(cursor) }),
      cursor,
    } as any;
  }

  it('resolves a custom role permission from the durable role document', async () => {
    const connection = connectionWithRoles([{ permissions: [Permission.USER_IMPERSONATE] }]);
    await expect(resolveEffectivePermissions(connection, { role: 'admin', custom_role_keys: ['support_ops'] }))
      .resolves.toContain(Permission.USER_IMPERSONATE);
    expect(connection.collection).toHaveBeenCalledWith('admin_custom_roles');
  });

  it('does not grant arbitrary permissions from a custom role document', async () => {
    const connection = connectionWithRoles([{ permissions: ['not.a.real.permission'] }]);
    await expect(resolveEffectivePermissions(connection, { role: 'guest', custom_role_keys: ['support_ops'] }))
      .resolves.not.toContain('not.a.real.permission');
  });

  it('uses only catalogued direct grants', async () => {
    const connection = connectionWithRoles([]);
    const permissions = await resolveEffectivePermissions(connection, { role: 'guest', permissions: [Permission.USER_IMPERSONATE, 'forged.permission'] });
    expect(permissions).toContain(Permission.USER_IMPERSONATE);
    expect(permissions).not.toContain('forged.permission');
  });
});

describe('restrictive admin roles (owner decision 29)', () => {
  const OWNER = 'owner@nabd.test';
  let prev: string | undefined;
  beforeAll(() => { prev = process.env.ADMIN_PASSKEY_EMAIL; process.env.ADMIN_PASSKEY_EMAIL = OWNER; });
  afterAll(() => { if (prev === undefined) delete process.env.ADMIN_PASSKEY_EMAIL; else process.env.ADMIN_PASSKEY_EMAIL = prev; });

  function connection(user: any, roles: any[] = [], failUsers = false) {
    const cursor: any = { project: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(roles) };
    return {
      collection: jest.fn((name: string) => name === 'users'
        ? { findOne: failUsers ? jest.fn().mockRejectedValue(new Error('down')) : jest.fn().mockResolvedValue(user) }
        : { find: jest.fn().mockReturnValue(cursor) }),
    } as any;
  }
  const all = Object.values(Permission).sort();

  it('an admin with no custom role holds no permission', async () => {
    await expect(resolveStaffAccess(connection({ email: 'staff@nabd.test' }), { id: 'a1', role: 'admin' }))
      .resolves.toEqual({ permissions: [], is_owner: false });
  });

  it("an admin holds exactly the union of their roles' permissions, read from the stored record", async () => {
    const conn = connection({ email: 'staff@nabd.test', custom_role_keys: ['coupons_desk', 'cms_desk'] }, [
      { permissions: [Permission.COUPONS_MANAGE] }, { permissions: [Permission.CMS_EDIT, 'forged.permission'] },
    ]);
    // A token cannot add role keys: the stored record wins.
    const access = await resolveStaffAccess(conn, { id: 'a1', role: 'admin', custom_role_keys: ['everything'] });
    expect(access.permissions.sort()).toEqual([Permission.CMS_EDIT, Permission.COUPONS_MANAGE].sort());
    expect(access.is_owner).toBe(false);
  });

  it('the designated owner and super_admin hold every permission', async () => {
    const owner = await resolveStaffAccess(connection({ email: 'Owner@Nabd.test' }), { id: 'o1', role: 'admin' });
    expect(owner.is_owner).toBe(true);
    expect(owner.permissions.sort()).toEqual(all);
    const sup = await resolveStaffAccess(connection(null), { id: 's1', role: 'super_admin' });
    expect(sup.permissions.sort()).toEqual(all);
  });

  it('the owner email on a non-admin account grants nothing extra', async () => {
    const access = await resolveStaffAccess(connection({ email: OWNER }), { id: 'p1', role: 'patient' });
    expect(access.is_owner).toBe(false);
  });

  it('fails closed when the user record cannot be read', async () => {
    await expect(resolveStaffAccess(connection(null, [], true), { id: 'a1', role: 'admin', permissions: [Permission.RBAC_MANAGE] }))
      .resolves.toEqual({ permissions: [], is_owner: false });
  });
});

describe('SupportSessionContextController', () => {
  const controller = new SupportSessionContextController();

  it('returns a read-only context only after guard validation attaches the durable session', () => {
    const response = controller.context(
      { id: 'patient-1', role: 'patient', scope: 'impersonation' },
      { impersonator: { id: 'admin-1', role: 'admin' }, impersonationSession: { id: 'imp-1', expiresAt: new Date('2030-01-01T00:00:00.000Z') } },
    );
    expect(response).toEqual(expect.objectContaining({ active: true, read_only: true, session_id: 'imp-1', target: { id: 'patient-1', role: 'patient' } }));
  });

  it('fails closed without a guard-validated impersonation session', () => {
    expect(() => controller.context({ id: 'patient-1', scope: 'impersonation' }, {})).toThrow(ForbiddenException);
  });
});
