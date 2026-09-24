/** F07: provider settings/pricing, working-hours, insurance-matrix — provider roles + ownership. */
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { ProviderOpsController, ProviderOpsService } from '../../src/modules/provider-ops/provider-ops.module';
import { LegalEnterpriseController } from '../../src/modules/legal/legal-enterprise.controller';
import { LegalEnterpriseService } from '../../src/modules/legal/legal-enterprise.service';
import { buildSecurityApp, patientToken, post, put, tokenFor } from './harness';

describe('F07 provider settings access control', () => {
  let app: INestApplication;
  const ops = {
    requestSettingChange: jest.fn(async (providerId: string, _key: string, _v: any) => ({ ok: true, provider_id: providerId })),
    replyReview: jest.fn(async (providerId: string, ratingId: string, _reply: string) => {
      // rating r1 belongs to doctor-1; anyone else replying is cross-account.
      if (!(providerId === 'doctor-1' && ratingId === 'r1')) throw new ForbiddenException('review_not_owned');
      return { ok: true };
    }),
  };
  const legal = {
    setProviderInsurance: jest.fn(async (providerId: string, _c: string[]) => ({ ok: true, provider_id: providerId })),
    getProviderInsurance: jest.fn(async () => ({ companies: [] })),
  };

  beforeAll(async () => {
    app = await buildSecurityApp(
      [ProviderOpsController, LegalEnterpriseController],
      [
        { provide: ProviderOpsService, useValue: ops },
        { provide: LegalEnterpriseService, useValue: legal },
      ],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403 on pricing, working-hours, insurance-matrix', async () => {
    const t = patientToken();
    await put(app, '/api/v1/provider/ops/settings/pricing', t, { pricing: 1 }).expect(403);
    await put(app, '/api/v1/provider/ops/working-hours', t, { hours: [] }).expect(403);
    await put(app, '/api/v1/legal/provider/insurance-matrix', t, { companies: ['bupa'] }).expect(403);
  });

  it('provider own settings → 2xx', async () => {
    const t = tokenFor('doctor-1', 'doctor');
    const r1 = await put(app, '/api/v1/provider/ops/settings/pricing', t, { pricing: 100 });
    expect([200, 201]).toContain(r1.status);
    const r2 = await put(app, '/api/v1/legal/provider/insurance-matrix', t, { companies: ['bupa'] });
    expect([200, 201]).toContain(r2.status);
  });

  it("provider replying to another provider's review → 403", async () => {
    await post(app, '/api/v1/provider/ops/reviews/r1/reply', tokenFor('doctor-2', 'doctor'), { reply: 'hi' }).expect(403);
    const ok = await post(app, '/api/v1/provider/ops/reviews/r1/reply', tokenFor('doctor-1', 'doctor'), { reply: 'thanks' });
    expect([200, 201]).toContain(ok.status);
  });
});
