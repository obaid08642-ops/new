/** F01: POST /nabd-extensions/wallet/credit, /debit — ADMIN only with audit log. */
import { INestApplication } from '@nestjs/common';
import { NabdExtensionsController } from '../../src/modules/nabd-extensions/nabd-extensions.controller';
import { NabdExtensionsService } from '../../src/modules/nabd-extensions/nabd-extensions.service';
import { PharmacyOfferService } from '../../src/modules/pharmacy/services/pharmacy-offer.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F01 wallet admin routes access control', () => {
  let app: INestApplication;
  const svc = {
    processWalletTransaction: jest.fn(async () => ({ ok: true, id: 'txn_1' })),
    auditAdminWalletAdjustment: jest.fn(async () => ({})),
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

  it('patient token → 403 on credit', async () => {
    await post(app, '/api/v1/wallet/credit', patientToken(), { ownerId: 'p1', amount: 100 }).expect(403);
    expect(svc.processWalletTransaction).not.toHaveBeenCalled();
  });

  it('patient token → 403 on debit', async () => {
    await post(app, '/api/v1/wallet/debit', patientToken(), { ownerId: 'p1', amount: 50 }).expect(403);
    expect(svc.processWalletTransaction).not.toHaveBeenCalled();
  });

  it('admin token → 2xx on credit with audit log', async () => {
    const res = await post(app, '/api/v1/wallet/credit', tokenFor('admin-1', 'admin'), { ownerId: 'p1', amount: 5000 });
    expect([200, 201]).toContain(res.status);
    expect(svc.processWalletTransaction).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'p1', amount: 5000, type: 'credit',
    }));
    expect(svc.auditAdminWalletAdjustment).toHaveBeenCalled();
  });

  it('admin token → 2xx on debit with audit log', async () => {
    const res = await post(app, '/api/v1/wallet/debit', tokenFor('admin-1', 'admin'), { ownerId: 'p1', amount: 100 });
    expect([200, 201]).toContain(res.status);
    expect(svc.processWalletTransaction).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'p1', amount: 100, type: 'debit',
    }));
    expect(svc.auditAdminWalletAdjustment).toHaveBeenCalled();
  });
});