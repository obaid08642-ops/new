/** F02: POST /kill-switches/:key — ADMIN only (patient once disabled chat app-wide). */
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SystemConfig } from '../../src/schemas/system-config.schema';
import { KillSwitchesController } from '../../src/modules/admin/governance/admin-governance.module';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F02 kill-switches access control', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const store: any = {
      value: [{ key: 'chat', value: true }],
      markModified() {},
      save: async () => ({}),
    };
    const configModel = {
      findOne: async () => store,
      create: async (doc: any) => ({ ...doc, markModified() {}, save: async () => ({}) }),
    };
    app = await buildSecurityApp(
      [KillSwitchesController],
      [{ provide: getModelToken(SystemConfig.name), useValue: configModel }],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/kill-switches/chat', patientToken(), { enabled: false }).expect(403);
  });

  it('admin → 2xx', async () => {
    const res = await post(app, '/api/v1/kill-switches/chat', tokenFor('admin-1', 'admin'), { enabled: false });
    expect([200, 201]).toContain(res.status);
  });
});
