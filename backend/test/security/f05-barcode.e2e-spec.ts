/** F05: POST /nabd-extensions/labs/samples/barcode-verify — LAB owner only, real bind. */
import { ForbiddenException, INestApplication, NotFoundException } from '@nestjs/common';
import { NabdExtensionsController } from '../../src/modules/nabd-extensions/nabd-extensions.controller';
import { NabdExtensionsService } from '../../src/modules/nabd-extensions/nabd-extensions.service';
import { PharmacyOfferService } from '../../src/modules/pharmacy/services/pharmacy-offer.service';
import { buildSecurityApp, patientToken, post, tokenFor } from './harness';

describe('F05 lab barcode bind access control', () => {
  let app: INestApplication;
  // Mirrors bindSampleBarcode: sample s1 belongs to lab-1's booking.
  const svc = {
    logActivity: jest.fn(async () => ({})),
    bindSampleBarcode: jest.fn(async (staff: any, sampleId: string, barcodeId: string) => {
      if (sampleId !== 's1') throw new NotFoundException('sample_not_found');
      if (staff?.role !== 'admin' && staff?.id !== 'lab-1') throw new ForbiddenException('sample_booking_not_owned');
      return { id: 's1', barcode: barcodeId, stage: 'received' };
    }),
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

  it('patient token → 403', async () => {
    await post(app, '/api/v1/nabd-extensions/labs/samples/barcode-verify', patientToken(), { sampleId: 's1', barcodeId: 'b1' }).expect(403);
    expect(svc.bindSampleBarcode).not.toHaveBeenCalled();
  });

  it('owning lab → 2xx with the bound barcode (no fake success)', async () => {
    const res = await post(app, '/api/v1/nabd-extensions/labs/samples/barcode-verify', tokenFor('lab-1', 'lab'), { sampleId: 's1', barcodeId: 'b1' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.barcode).toBe('b1');
  });

  it("other lab (not serving the booking) → 403", async () => {
    await post(app, '/api/v1/nabd-extensions/labs/samples/barcode-verify', tokenFor('lab-2', 'lab'), { sampleId: 's1', barcodeId: 'b1' }).expect(403);
  });
});
