/** F01: patient wallet routes removed (R6) — must answer 404, not 403/201. */
import { INestApplication } from '@nestjs/common';
import { NabdExtensionsController } from '../../src/modules/nabd-extensions/nabd-extensions.controller';
import { NabdExtensionsService } from '../../src/modules/nabd-extensions/nabd-extensions.service';
import * as extensionDtos from '../../src/modules/nabd-extensions/nabd-extensions.dto';
import { PharmacyOfferService } from '../../src/modules/pharmacy/services/pharmacy-offer.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F01 wallet routes are gone (R6)', () => {
  let app: INestApplication;
  const svc = {
    processWalletTransaction: jest.fn(async () => ({ ok: true })),
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

  it('GET /wallet/balance → 404 for any role', async () => {
    await post(app, '/api/v1/wallet/balance', patientToken(), {}).expect(404);
    await post(app, '/api/v1/wallet/balance', tokenFor('admin-1', 'admin'), {}).expect(404);
  });

  it('POST /wallet/credit → 404 (no admin backdoor remains)', async () => {
    await post(app, '/api/v1/wallet/credit', tokenFor('admin-1', 'admin'), { amount: 5000 }).expect(404);
    expect(svc.processWalletTransaction).not.toHaveBeenCalled();
  });

  it('POST /wallet/debit → 404', async () => {
    await post(app, '/api/v1/wallet/debit', tokenFor('root-1', 'super_admin'), { amount: 10 }).expect(404);
  });

  // a537647 review: R6 said remove the routes "with their service methods and DTOs".
  it('leaves no admin wallet service methods or DTOs behind', () => {
    const proto = NabdExtensionsService.prototype as unknown as Record<string, unknown>;
    expect(proto.getWalletBalance).toBeUndefined();
    expect(proto.auditAdminWalletAdjustment).toBeUndefined();
    expect(Object.keys(extensionDtos)).not.toEqual(expect.arrayContaining(['CreditWalletDto']));
    expect(Object.keys(extensionDtos)).not.toEqual(expect.arrayContaining(['DebitWalletDto']));
  });
});
