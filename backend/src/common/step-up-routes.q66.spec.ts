// Q66 / Q89 / X2: every sensitive admin action needs a fresh step-up
// (passkey) AND a named permission, not the admin session alone. This list
// fails when any of them loses either decorator.
import 'reflect-metadata';
import { STEP_UP_KEY } from './step-up.guard';
import { PERMISSIONS_KEY } from './permissions';
import { AdminSystemController } from '../modules/compat/admin-spa.module';
import { LegalController } from '../modules/legal/legal.module';
import { AdminImpersonationController } from '../modules/admin/enterprise/admin-impersonation.controller';
import { ReturnsController, AdminReturnsController } from '../modules/returns/returns.controller';
import { InsuranceController } from '../modules/insurance/insurance.module';
import { PaymentsController } from '../modules/payments/payments.module';
import { AdminOrdersConsoleController as AdminOrdersController } from '../modules/admin/enterprise/admin-orders.controller';
import { AdminFinanceSuiteController as AdminFinanceController } from '../modules/admin/enterprise/admin-finance.controller';
import { AdminDisputesController } from '../modules/admin/enterprise/admin-disputes.controller';
import { AdminSecurityController } from '../modules/admin/enterprise/admin-security.controller';

const ROUTES: Array<[string, any, string]> = [
  ['PUT system/permissions', AdminSystemController, 'putPermissions'],
  ['PUT admin/legal/commissions-policy', LegalController, 'updateCommissions'],
  ['POST admin/impersonation/start', AdminImpersonationController, 'start'],
  ['POST returns/:id/decide', ReturnsController, 'decide'],
  ['POST admin/returns/:id/decide', AdminReturnsController, 'decide'],
  ['POST insurance/companies', InsuranceController, 'createCompany'],
  ['PATCH insurance/companies/:id', InsuranceController, 'updateCompany'],
  ['DELETE insurance/companies/:id', InsuranceController, 'deleteCompany'],
  ['POST insurance/companies/:id/reactivate', InsuranceController, 'reactivateCompany'],
  ['POST payments/refund/:txn', PaymentsController, 'refund'],
  ['POST admin/orders/:kind/:id/refund', AdminOrdersController, 'refund'],
  ['POST admin/finance/commissions/config', AdminFinanceController, 'updateConfig'],
  ['POST admin/finance/payouts/:id/approve', AdminFinanceController, 'approvePayout'],
  ['POST admin/finance/payouts/:id/reject', AdminFinanceController, 'rejectPayout'],
  ['POST admin/disputes/:id/resolve', AdminDisputesController, 'resolve'],
  ['POST admin/rbac/roles', AdminSecurityController, 'createRole'],
  ['POST admin/rbac/users/:userId/roles', AdminSecurityController, 'assignUserRoles'],
];

describe('sensitive admin routes need step-up and a permission (Q66/Q89/X2)', () => {
  it.each(ROUTES)('%s', (_route, ctrl, method) => {
    const handler = ctrl.prototype[method];
    expect(typeof handler).toBe('function');
    expect(Reflect.getMetadata(STEP_UP_KEY, handler) ?? Reflect.getMetadata(STEP_UP_KEY, ctrl)).toBe(true);
    const perms = Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? Reflect.getMetadata(PERMISSIONS_KEY, ctrl);
    expect(Array.isArray(perms) && perms.length > 0).toBe(true);
  });
});
