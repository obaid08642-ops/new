import { ForbiddenException } from '@nestjs/common';
import { Permission } from './permissions';
import { resolveEffectivePermissions } from './effective-permissions';
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
