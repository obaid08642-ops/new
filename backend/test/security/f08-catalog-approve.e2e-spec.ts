/** F08: POST /service-catalog/admin/:type/:id/approve — ADMIN only. */
import { INestApplication } from '@nestjs/common';
import { ServiceCatalogController, ServiceCatalogService } from '../../src/modules/service-catalog/service-catalog.module';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F08 service-catalog approve access control', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildSecurityApp(
      [ServiceCatalogController],
      [{ provide: ServiceCatalogService, useValue: { adminApproveService: async () => ({ ok: true }) } }],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/service-catalog/admin/lab/x1/approve', patientToken(), {}).expect(403);
  });

  it('admin → 2xx', async () => {
    const res = await post(app, '/api/v1/service-catalog/admin/lab/x1/approve', tokenFor('admin-1', 'admin'), {});
    expect([200, 201]).toContain(res.status);
  });

  it('provider role → 403', async () => {
    await post(app, '/api/v1/service-catalog/admin/lab/x1/approve', tokenFor('lab-1', 'lab'), {}).expect(403);
  });
});
