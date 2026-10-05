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
import { AdminFinanceEngineController } from '../modules/finance-engine/finance-engine.module';
import { AdminLoyaltyController } from '../modules/compat/admin-spa.module';
import { AdminLoyaltyController as LoyaltyAdminController } from '../modules/loyalty/loyalty.controller';
import { FinanceController } from '../modules/admin/web-core/controllers/finance.controller';
import { ProviderAdminController } from '../modules/provider/provider.controllers';
import { ProvidersController } from '../modules/provider/providers.controller';
import { AdminConfigController } from '../modules/admin/web-core/controllers/admin-config.controller';
import { BusinessRulesController } from '../modules/business-rules/business-rules.module';
import { AdminController } from '../modules/admin/admin.controller';
import { AdminOrdersConsoleController } from '../modules/admin/enterprise/admin-orders.controller';
import { AdminRefundsController, AdminOverrideController } from '../modules/patient-ux/patient-ux.module';
import { CommissionsController } from '../modules/admin/governance/admin-governance.module';
import { FinanceCoreController } from '../modules/insurance-engine/insurance-engine.module';
import { AdminDeliveryController, AdminNotificationsController, AdminInsuranceClaimsController as CompatClaimsController } from '../modules/compat/admin-spa.module';
import { AdminNotificationCenterController } from '../modules/admin/notification-center/admin-notification-center.module';
import { AdminGdprController } from '../modules/admin/enterprise/admin-crm.controller';
import { SystemConfigController } from '../modules/admin/governance/system-config.controller';
import { BansController } from '../modules/bans/bans.controller';
import { AdminFulfillmentPolicyController } from '../modules/pharmacy/pharmacy.controllers';
import { AdminInsuranceClaimsController } from '../modules/insurance/insurance.module';

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
  // Second independent check (step-up round): money, points, config and account actions.
  ['POST admin/finance-engine/commission-rules', AdminFinanceEngineController, 'setCommissionRule'],
  ['POST admin/finance-engine/approvals/:id/decide', AdminFinanceEngineController, 'decideApproval'],
  ['POST admin/finance-engine/refunds/:id/execute', AdminFinanceEngineController, 'executeRefund'],
  ['PUT loyalty/config', AdminLoyaltyController, 'putConfig'],
  ['PUT loyalty/earn-rules/:id', AdminLoyaltyController, 'updateEarnRule'],
  ['POST loyalty/earn-rules/:id/toggle', AdminLoyaltyController, 'toggleEarnRule'],
  ['POST loyalty/manual-adjust', AdminLoyaltyController, 'manualAdjust'],
  ['POST admin/loyalty/rewards', LoyaltyAdminController, 'createReward'],
  ['PATCH admin/loyalty/rewards/:id', LoyaltyAdminController, 'updateReward'],
  ['DELETE admin/loyalty/rewards/:id', LoyaltyAdminController, 'deleteReward'],
  ['POST admin/loyalty/challenges', LoyaltyAdminController, 'createChallenge'],
  ['PATCH admin/loyalty/challenges/:id', LoyaltyAdminController, 'updateChallenge'],
  ['DELETE admin/loyalty/challenges/:id', LoyaltyAdminController, 'deleteChallenge'],
  ['PUT admin/loyalty/config', LoyaltyAdminController, 'updateConfig'],
  ['POST admin/finance/withdrawals/:id/execute', FinanceController, 'executePayout'],
  ['POST admin/finance/withdrawals/:id/reject', FinanceController, 'rejectPayout'],
  ['POST admin/providers/:id/suspend', ProviderAdminController, 'suspend'],
  ['POST providers/:id/suspend', ProvidersController, 'suspend'],
  ['PUT admin/config/dispute-config', AdminConfigController, 'updateDisputeConfig'],
  ['POST business-rules/config/surge', BusinessRulesController, 'updateSurge'],
  ['POST business-rules/config/fees', BusinessRulesController, 'updateFees'],
  ['POST admin/users/:userId/ban', AdminController, 'banUser'],
  ['POST admin/users/:userId/unban', AdminController, 'unbanUser'],
  ['DELETE admin/users/:userId', AdminController, 'deleteUser'],
  // Third independent check: money, payout destination, points, mass messages,
  // admin accounts, personal data, bans and platform config.
  ['POST admin/orders/:kind/:id/compensate', AdminOrdersConsoleController, 'compensate'],
  ['POST admin/refunds/:id/decide', AdminRefundsController, 'decide'],
  ['POST admin/override/payment', AdminOverrideController, 'markPayment'],
  ['PUT commissions/:id', CommissionsController, 'update'],
  ['POST admin/providers/:id/approve-bank', ProviderAdminController, 'approveBank'],
  ['POST finance/ledger/accrue', FinanceCoreController, 'accrue'],
  ['POST loyalty/redeem', AdminLoyaltyController, 'redeem'],
  ['POST delivery/rules', AdminDeliveryController, 'createRule'],
  ['PUT delivery/rules/:id', AdminDeliveryController, 'updateRule'],
  ['POST delivery/rules/:id/toggle', AdminDeliveryController, 'toggleRule'],
  ['DELETE delivery/rules/:id', AdminDeliveryController, 'deleteRule'],
  ['PUT delivery/base-fees', AdminDeliveryController, 'baseFees'],
  ['POST notifications/send', AdminNotificationsController, 'send'],
  ['POST insurance/claims/:id/approve (compat)', CompatClaimsController, 'approve'],
  ['POST insurance/claims/:id/reject (compat)', CompatClaimsController, 'reject'],
  ['POST admin/insurance/claims/:id/decide', AdminInsuranceClaimsController, 'decide'],
  ['POST admin/notification-center/broadcasts', AdminNotificationCenterController, 'broadcast'],
  ['POST admin/notification-center/campaigns/:id/send', AdminNotificationCenterController, 'sendCampaign'],
  ['POST admin/sub-admins', AdminController, 'createSubAdmin'],
  ['POST admin/gdpr/:id/export/complete', AdminGdprController, 'completeExport'],
  ['POST admin/gdpr/:id/delete/complete', AdminGdprController, 'completeDelete'],
  ['PUT admin/governance/system-config', SystemConfigController, 'updateConfig'],
  ['POST bans', BansController, 'ban'],
  ['DELETE bans/:value', BansController, 'unban'],
  ['PUT admin/pharmacy/fulfillment-policies/cod', AdminFulfillmentPolicyController, 'setCod'],
];
// Not listed on purpose: POST admin/impersonation/:id/revoke ends a support
// session; making the stop button wait for a passkey would only delay
// cutting off a misused session.

describe('sensitive admin routes need step-up and a permission (Q66/Q89/X2)', () => {
  it.each(ROUTES)('%s', (_route, ctrl, method) => {
    const handler = ctrl.prototype[method];
    expect(typeof handler).toBe('function');
    expect(Reflect.getMetadata(STEP_UP_KEY, handler) ?? Reflect.getMetadata(STEP_UP_KEY, ctrl)).toBe(true);
    const perms = Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? Reflect.getMetadata(PERMISSIONS_KEY, ctrl);
    expect(Array.isArray(perms) && perms.length > 0).toBe(true);
  });
});
