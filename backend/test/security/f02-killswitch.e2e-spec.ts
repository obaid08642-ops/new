/** F02: POST /kill-switches/:key — patient once disabled chat app-wide. Issues 955 / 995: super admin only (modules.manage). */
import { INestApplication } from '@nestjs/common';
import { KillSwitchesController } from '../../src/modules/kill-switches/kill-switches.controller';
import { KillSwitchesService } from '../../src/modules/kill-switches/kill-switches.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F02 kill-switches access control', () => {
  let app: INestApplication;
  const switches = { list: jest.fn(async () => []), set: jest.fn(async () => []) };

  beforeAll(async () => {
    app = await buildSecurityApp([KillSwitchesController], [{ provide: KillSwitchesService, useValue: switches }]);
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/kill-switches/chat_enabled', patientToken(), { value: false, reason: 'probe reason' }).expect(403);
  });

  // admin-1 is the owner account in the harness (owner decision 29), so the principal without the permission is another admin id
  it('role admin without modules.manage → 403', async () => {
    await post(app, '/api/v1/kill-switches/chat_enabled', tokenFor('admin-2', 'admin'), { value: false, reason: 'probe reason' }).expect(403);
    expect(switches.set).not.toHaveBeenCalled();
  });

  it('super admin → 2xx', async () => {
    const res = await post(app, '/api/v1/kill-switches/chat_enabled', tokenFor('owner-1', 'super_admin'), { value: false, reason: 'probe reason' });
    expect([200, 201]).toContain(res.status);
    expect(switches.set).toHaveBeenCalledWith('chat_enabled', false, 'probe reason', expect.objectContaining({ id: 'owner-1' }));
  });
});
