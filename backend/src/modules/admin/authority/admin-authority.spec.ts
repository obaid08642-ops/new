import 'reflect-metadata';
import { STEP_UP_KEY } from '../../../common/step-up.guard';
import { PERMISSIONS_KEY, Permission } from '../../../common/permissions';
import { AdminAuthorityController } from './admin-authority.module';

// Dead-surface gate: every mutating authority route must carry BOTH
// @StepUp() and @RequirePermissions(...). Metadata-only assertions —
// no server, no DB, controller never instantiated.
const MUTATING: Array<{ method: string; permission: Permission }> = [
  { method: 'fca', permission: Permission.APPOINTMENT_UPDATE },
  { method: 'fcoappt', permission: Permission.APPOINTMENT_UPDATE },
  { method: 'fra', permission: Permission.APPOINTMENT_UPDATE },
  { method: 'fco', permission: Permission.ORDER_CANCEL },
  { method: 'fkco', permission: Permission.ORDER_COMPENSATE },
  { method: 'frr', permission: Permission.ORDER_REASSIGN },
  { method: 'fcl', permission: Permission.DISPUTES_RESOLVE },
  { method: 'fkcl', permission: Permission.DISPUTES_RESOLVE },
  { method: 'oil', permission: Permission.DISPUTES_RESOLVE },
  { method: 'fcr', permission: Permission.DISPUTES_RESOLVE },
  { method: 'fkcr', permission: Permission.DISPUTES_RESOLVE },
  { method: 'oir', permission: Permission.DISPUTES_RESOLVE },
  { method: 'susp', permission: Permission.USER_EDIT },
  { method: 'unsp', permission: Permission.USER_EDIT },
  { method: 'impersonate', permission: Permission.USER_IMPERSONATE },
];

describe('AdminAuthorityController dead-surface gate', () => {
  it.each(MUTATING)('$method carries @StepUp() + @RequirePermissions($permission)', ({ method, permission }) => {
    const fn = (AdminAuthorityController.prototype as any)[method];
    expect(fn).toBeDefined();
    expect(Reflect.getMetadata(STEP_UP_KEY, fn)).toBe(true);
    const perms = Reflect.getMetadata(PERMISSIONS_KEY, fn);
    expect(Array.isArray(perms)).toBe(true);
    expect(perms).toContain(permission);
  });

  it('GET actions (audit-log read) stays step-up free', () => {
    const fn = (AdminAuthorityController.prototype as any)['log'];
    expect(fn).toBeDefined();
    expect(Reflect.getMetadata(STEP_UP_KEY, fn)).toBeFalsy();
  });
});
