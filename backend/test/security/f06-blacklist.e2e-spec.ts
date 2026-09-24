/** F06: POST /provider/ops/doctor/blacklist/:patientId — DOCTOR own only. */
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { ProviderOpsController, ProviderOpsService } from '../../src/modules/provider-ops/provider-ops.module';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F06 doctor blacklist access control', () => {
  let app: INestApplication;
  // Blacklist rows are keyed by the acting doctor; cross-doctor writes fail.
  const svc = {
    blacklistPatient: jest.fn(async (doctorId: string, _patientId: string, _reason?: string) => {
      if (doctorId !== 'doctor-1') throw new ForbiddenException('not_your_patient_list');
      return { ok: true, blacklisted: true };
    }),
  };

  beforeAll(async () => {
    app = await buildSecurityApp(
      [ProviderOpsController],
      [{ provide: ProviderOpsService, useValue: svc }],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/provider/ops/doctor/blacklist/p9', patientToken(), { reason: 'x' }).expect(403);
    expect(svc.blacklistPatient).not.toHaveBeenCalled();
  });

  it('own doctor → 2xx', async () => {
    const res = await post(app, '/api/v1/provider/ops/doctor/blacklist/p9', tokenFor('doctor-1', 'doctor'), { reason: 'no-show' });
    expect([200, 201]).toContain(res.status);
  });

  it('pharmacy role (wrong provider type) → 403', async () => {
    await post(app, '/api/v1/provider/ops/doctor/blacklist/p9', tokenFor('pharmacy-1', 'pharmacy'), {}).expect(403);
  });
});
