/** F04: POST /nabd-extensions/pharmacy/broadcast/respond — PHARMACY target only, real offer draft. */
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { NabdExtensionsController } from '../../src/modules/nabd-extensions/nabd-extensions.controller';
import { NabdExtensionsService } from '../../src/modules/nabd-extensions/nabd-extensions.service';
import { PharmacyOfferService } from '../../src/modules/pharmacy/services/pharmacy-offer.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F04 pharmacy broadcast respond access control', () => {
  let app: INestApplication;
  // Mirrors the canonical offer service: only a notified pharmacy may draft.
  const offers = {
    upsertDraft: jest.fn(async (user: any, orderId: string, _body: any) => {
      if (user.id !== 'pharmacy-1') throw new ForbiddenException('pharmacy_not_notified_for_broadcast');
      return { id: 'offer-1', order_id: orderId, status: 'draft', pharmacy_account_id: user.id };
    }),
  };
  const svc = { logActivity: jest.fn(async () => ({})) };

  beforeAll(async () => {
    app = await buildSecurityApp(
      [NabdExtensionsController],
      [
        { provide: NabdExtensionsService, useValue: svc },
        { provide: PharmacyOfferService, useValue: offers },
      ],
    );
  });
  afterAll(async () => { await app?.close(); });

  it('patient token → 403', async () => {
    await post(app, '/api/v1/nabd-extensions/pharmacy/broadcast/respond', patientToken(), { order_id: 'o1', items: [] }).expect(403);
    expect(offers.upsertDraft).not.toHaveBeenCalled();
  });

  it('notified pharmacy → 2xx with a real draft (no fake success)', async () => {
    const res = await post(app, '/api/v1/nabd-extensions/pharmacy/broadcast/respond', tokenFor('pharmacy-1', 'pharmacy'), { order_id: 'o1', items: [] });
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('draft');
    expect(res.body.pharmacy_account_id).toBe('pharmacy-1');
  });

  it('pharmacy NOT notified for the broadcast → 403', async () => {
    await post(app, '/api/v1/nabd-extensions/pharmacy/broadcast/respond', tokenFor('pharmacy-2', 'pharmacy'), { order_id: 'o1', items: [] }).expect(403);
  });
});
