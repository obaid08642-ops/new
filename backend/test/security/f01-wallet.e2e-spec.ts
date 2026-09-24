/** F01: POST /nabd-extensions/wallet/credit|debit — ADMIN only + audit entry. */
import { INestApplication } from '@nestjs/common';
import { NabdExtensionsController } from '../../src/modules/nabd-extensions/nabd-extensions.controller';
import { NabdExtensionsService } from '../../src/modules/nabd-extensions/nabd-extensions.service';
import { PharmacyOfferService } from '../../src/modules/pharmacy/services/pharmacy-offer.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F01 wallet credit/debit access control', () => {
  let app: INestApplication;
  const audits: any[] = [];
  const svc = {
    processWalletTransaction: jest.fn(async () => ({ ok: true })),
    auditAdminWalletAdjustment: jest.fn(async (_actor: any, entry: any) => { audits.push(entry); }),
    logActivity: jest.fn(async () => ({})),
  };

  beforeAll(async () => {
    app = await buildSecurityApp(
      [NabdExtensionsController],
      [
        { provide: NabdExtensionsService, useValue: svc },
        { provide: PharmacyOfferService, useValue: {} },
      ],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403 on credit and debit', async () => {
    const t = patientToken();
    await post(app, '/api/v1/nabd-extensions/wallet/credit', t, { amount: 5000 }).expect(403);
    await post(app, '/api/v1/nabd-extensions/wallet/debit', t, { amount: 5000 }).expect(403);
  });

  it('admin → 2xx and writes an audit entry', async () => {
    const t = tokenFor('admin-1', 'admin');
    await post(app, '/api/v1/nabd-extensions/wallet/credit', t, { amount: 5000 }).expect(201);
    expect(svc.processWalletTransaction).toHaveBeenCalled();
    expect(svc.auditAdminWalletAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      expect.objectContaining({ amount: 5000, type: 'credit' }),
    );
    expect(audits.length).toBeGreaterThan(0);
  });

  it('super_admin also passes via hierarchy', async () => {
    await post(app, '/api/v1/nabd-extensions/wallet/debit', tokenFor('root-1', 'super_admin'), { amount: 10 }).expect(201);
  });
});
