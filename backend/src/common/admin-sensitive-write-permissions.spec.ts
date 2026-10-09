import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY, Permission, ROLE_PERMISSIONS } from './permissions';
import { ROLES_KEY } from './auth.guard';
import { UserRole } from './enums';
import { LabsController } from '../modules/labs/labs.controller';
import { RadiologyController } from '../modules/radiology/radiology.controller';
import { NursingController } from '../modules/home-care/home-care.controller';
import { MedicinesController } from '../modules/medicines/medicines.controller';
import { ProviderAdminController } from '../modules/provider/provider.controllers';
import { AdminFinanceCoreController } from '../modules/insurance-engine/insurance-engine.module';
import { AdminAppointmentsController } from '../modules/care/appointments.controller';
import { FinanceController } from '../modules/admin/web-core/controllers/finance.controller';
import { AdminController } from '../modules/admin/admin.controller';
import { AdminCmsController } from '../modules/admin/enterprise/admin-cms.controller';
import { ProviderOnboardingController } from '../modules/provider-onboarding/provider-onboarding.module';

// Needs-review guard findings G-ROLE-ONLY-WRITE / G-OPEN: every sensitive admin write names the
// permission it needs, so a custom admin role without that permission is refused (403).
type Ctor = { prototype: object; name: string };
const VERB: Record<string, RequestMethod> = { POST: RequestMethod.POST, PUT: RequestMethod.PUT, PATCH: RequestMethod.PATCH, DELETE: RequestMethod.DELETE, GET: RequestMethod.GET };

function handler(cls: Ctor, verb: string, path: string): Function {
  const proto = cls.prototype as Record<string, unknown>;
  for (const name of Object.getOwnPropertyNames(proto)) {
    const fn = proto[name];
    if (typeof fn !== 'function' || name === 'constructor') continue;
    if (Reflect.getMetadata(PATH_METADATA, fn) === path && Reflect.getMetadata(METHOD_METADATA, fn) === VERB[verb]) return fn;
  }
  throw new Error(`${cls.name}: no ${verb} ${path}`);
}
const perms = (cls: Ctor, verb: string, path: string): Permission[] => Reflect.getMetadata(PERMISSIONS_KEY, handler(cls, verb, path)) || [];

const CASES: Array<[Ctor, string, string, Permission]> = [
  ...[LabsController, RadiologyController, NursingController].flatMap((c): Array<[Ctor, string, string, Permission]> => [
    [c, 'POST', 'admin/catalog', Permission.CATALOG_CREATE],
    [c, 'PUT', 'admin/catalog/:id', Permission.CATALOG_UPDATE],
    [c, 'DELETE', 'admin/catalog/:id', Permission.CATALOG_DELETE_RESTORE],
    [c, 'POST', 'admin/catalog/:id/approve', Permission.CATALOG_UPDATE],
    [c, 'POST', 'admin/catalog/bulk-approve', Permission.CATALOG_UPDATE],
  ]),
  [MedicinesController, 'POST', 'admin/image-suggestions/:suggestionId/approve', Permission.CATALOG_UPDATE],
  [MedicinesController, 'POST', 'admin/image-suggestions/:suggestionId/reject', Permission.CATALOG_UPDATE],
  [MedicinesController, 'POST', 'admin/change-requests/:requestId/approve', Permission.CATALOG_UPDATE],
  [MedicinesController, 'POST', 'admin/change-requests/:requestId/reject', Permission.CATALOG_UPDATE],
  ...['provider-deltas/:id/approve', 'provider-deltas/:id/reject', ':id/approve', ':id/reject', ':id/approve-bank', ':id/request-changes', ':id/suspend', ':id/reactivate']
    .map((p): [Ctor, string, string, Permission] => [ProviderAdminController, 'POST', p, Permission.FACILITY_EDIT]),
  [AdminFinanceCoreController, 'POST', 'refunds/:id/decide', Permission.ORDER_REFUND],
  [AdminAppointmentsController, 'POST', ':id/cancel', Permission.ORDER_CANCEL],
  [FinanceController, 'POST', 'withdrawals/:id/execute', Permission.FINANCE_PAYOUT_APPROVE],
  [FinanceController, 'POST', 'withdrawals/:id/reject', Permission.FINANCE_PAYOUT_APPROVE],
  [AdminController, 'POST', 'users/:userId/ban', Permission.USER_EDIT],
  [AdminController, 'POST', 'users/:userId/unban', Permission.USER_EDIT],
  [AdminCmsController, 'POST', ':id/publish', Permission.CMS_EDIT],
  [AdminCmsController, 'PATCH', ':id/unpublish', Permission.CMS_EDIT],
];

describe('sensitive admin writes require a named permission', () => {
  it.each(CASES.map(([c, v, p, perm]) => [`${c.name} ${v} ${p}`, c, v, p, perm] as const))('%s', (_label, c, v, p, perm) => {
    expect(perms(c, v, p)).toEqual([perm]);
  });

  it('the built-in admin role keeps every permission these routes need (no lock-out)', () => {
    const needed = Array.from(new Set(CASES.map((x) => x[3])));
    expect(needed.filter((p) => !ROLE_PERMISSIONS[UserRole.ADMIN].includes(p))).toEqual([]);
  });

  it('the admin contract download is declared admin-only', () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, handler(ProviderOnboardingController, 'GET', 'admin/contracts/:id')) || [];
    expect(roles).toContain(UserRole.ADMIN);
  });
});
