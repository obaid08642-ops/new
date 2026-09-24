/** F03: POST /business-rules/config/surge — ADMIN only (patient once set ×5 multiplier). */
import { INestApplication } from '@nestjs/common';
import { BusinessRulesController } from '../../src/modules/business-rules/business-rules.module';
import { BusinessRulesService } from '../../src/modules/business-rules/business-rules.module';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F03 surge pricing config access control', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildSecurityApp(
      [BusinessRulesController],
      [{ provide: BusinessRulesService, useValue: { updateSurgeConfig: async (c: any) => c, getSurgeConfig: () => ({}) } }],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/business-rules/config/surge', patientToken(), { multiplier: 5 }).expect(403);
  });

  it('admin → 2xx', async () => {
    const res = await post(app, '/api/v1/business-rules/config/surge', tokenFor('admin-1', 'admin'), { multiplier: 1.2 });
    expect([200, 201]).toContain(res.status);
  });
});
