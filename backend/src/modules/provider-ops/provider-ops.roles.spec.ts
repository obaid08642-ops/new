import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../common/auth.guard';
import { ProviderCompatController, ProviderOpsController } from './provider-ops.module';

/**
 * Needs-review provider-admin-ish#2 / provider-shared#2: provider-only routes (wallet ledger, wallet
 * transactions, stats, settings, doctor lists) must refuse a patient session and let a provider through.
 * Runs the real JwtAuthGuard against the real @Roles metadata of each handler.
 */
describe('provider-ops role guards: patient 403, provider allowed', () => {
  const OLD_SECRET = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'unit-test-secret-min-32-chars-0123456789abcdef'; });
  afterAll(() => {
    if (OLD_SECRET === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = OLD_SECRET;
  });

  function guardFor(payload: Record<string, unknown>) {
    const jwt: any = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    // provider-scope tokens are checked against an approved provider account
    const conn: any = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue({ status: 'approved' }), insertOne: jest.fn() })) };
    return new JwtAuthGuard(jwt, new Reflector(), conn, { validate: jest.fn() } as any);
  }

  function ctx(cls: any, handler: string, path: string): any {
    const req = { headers: { authorization: 'Bearer t' }, params: {}, query: {}, body: {}, path, socket: { remoteAddress: '127.0.0.1' } };
    return { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => cls.prototype[handler], getClass: () => cls };
  }

  const patient = { id: 'patient-1', role: 'patient' };
  const doctor = { id: 'doc-1', role: 'provider', provider_type: 'doctor', scope: 'provider' };
  const hospital = { id: 'hosp-1', role: 'provider', provider_type: 'hospital', scope: 'provider' };

  const providerRoutes: Array<[any, string, string]> = [
    [ProviderOpsController, 'wallet', '/api/v1/provider/ops/wallet/ledger'],
    [ProviderCompatController, 'walletTx', '/api/v1/provider/wallet/transactions'],
    [ProviderCompatController, 'wallet', '/api/v1/provider/wallet'],
    [ProviderCompatController, 'statsToday', '/api/v1/provider/stats/today'],
    [ProviderCompatController, 'statsPeriod', '/api/v1/provider/stats/period'],
    [ProviderCompatController, 'getSched', '/api/v1/provider/schedule/settings'],
    [ProviderOpsController, 'leaves', '/api/v1/provider/ops/doctor/leave'],
    [ProviderOpsController, 'diagnoses', '/api/v1/provider/ops/doctor/diagnoses'],
    [ProviderOpsController, 'getCrm', '/api/v1/provider/ops/doctor/patient-crm/p1'],
  ];

  it.each(providerRoutes)('%p.%s refuses a patient session (403)', async (cls, handler, path) => {
    await expect(guardFor(patient).canActivate(ctx(cls, handler, path))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(providerRoutes)('%p.%s lets an approved provider through', async (cls, handler, path) => {
    await expect(guardFor(doctor).canActivate(ctx(cls, handler, path))).resolves.toBe(true);
  });

  it('a doctor applies his template; a patient cannot', async () => {
    const path = '/api/v1/provider/ops/doctor/templates/tpl_1/use';
    await expect(guardFor(patient).canActivate(ctx(ProviderOpsController, 'useTemplate', path))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guardFor(doctor).canActivate(ctx(ProviderOpsController, 'useTemplate', path))).resolves.toBe(true);
  });

  it('facility tariffs are for the hospital only (patient and doctor get 403)', async () => {
    for (const h of ['getTariffs', 'putTariffs']) {
      const c = () => ctx(ProviderCompatController, h, '/api/v1/provider/settings/tariffs');
      await expect(guardFor(patient).canActivate(c())).rejects.toBeInstanceOf(ForbiddenException);
      await expect(guardFor(doctor).canActivate(c())).rejects.toBeInstanceOf(ForbiddenException);
      await expect(guardFor(hospital).canActivate(c())).resolves.toBe(true);
    }
  });
});
