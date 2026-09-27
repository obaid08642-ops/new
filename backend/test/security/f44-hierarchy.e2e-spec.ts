/** F44: super_admin satisfies @Roles(ADMIN) via hierarchy on all admin surfaces. */
import { INestApplication } from '@nestjs/common';
import { MedicinesController } from '../../src/modules/medicines/medicines.controller';
import { MedicinesService } from '../../src/modules/medicines/medicines.service';
import { ChatController } from '../../src/modules/chat/chat.module';
import { ChatService } from '../../src/modules/chat/chat.service';
import { AiController } from '../../src/modules/ai/ai.controller';
import { AiService } from '../../src/modules/ai/ai.service';
import { AiGatewayService } from '../../src/modules/ai/ai-gateway.service';
import { AdminFinanceSuiteController } from '../../src/modules/admin/enterprise/admin-finance.controller';
import { FinanceSuiteService } from '../../src/modules/admin/enterprise/finance-suite.service';
import { buildSecurityApp, tokenFor } from './harness';
import request from 'supertest';

describe('F44 super_admin hierarchy on admin surfaces', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildSecurityApp(
      [MedicinesController, ChatController, AiController, AdminFinanceSuiteController],
      [
        { provide: MedicinesService, useValue: { adminListCatalog: async () => [] } },
        { provide: ChatService, useValue: { adminThreads: async () => [] } },
        { provide: AiService, useValue: {} },
        { provide: AiGatewayService, useValue: { listProviders: async () => [] } },
        { provide: FinanceSuiteService, useValue: { commissions: async () => ({}) } },
      ],
    );
  });
  afterAll(async () => { await app?.close(); });
  const get = (url: string, token: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  it('super_admin → 200 on all four admin surfaces', async () => {
    const t = tokenFor('root-1', 'super_admin');
    await get('/api/v1/medicines/admin/catalog', t).expect(200);
    await get('/api/v1/chat/admin/threads', t).expect(200);
    await get('/api/v1/ai/admin/gateway', t).expect(200);
    await get('/api/v1/admin/finance/commissions?from=2026-01-01&to=2026-09-01', t).expect(200);
  });

  it('plain admin → 200 as well (no regression)', async () => {
    const t = tokenFor('admin-1', 'admin');
    await get('/api/v1/medicines/admin/catalog', t).expect(200);
    await get('/api/v1/chat/admin/threads', t).expect(200);
  });

  it('patient → 403 on all four', async () => {
    const t = tokenFor('patient-1', 'patient');
    await get('/api/v1/medicines/admin/catalog', t).expect(403);
    await get('/api/v1/chat/admin/threads', t).expect(403);
    await get('/api/v1/ai/admin/gateway', t).expect(403);
    await get('/api/v1/admin/finance/commissions?from=2026-01-01&to=2026-09-01', t).expect(403);
  });
});
