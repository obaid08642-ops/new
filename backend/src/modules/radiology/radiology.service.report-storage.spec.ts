import { BadRequestException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';

describe('RadiologyOpsService secure report storage', () => {
  let service: any;
  let booking: any;
  let storage: any;

  beforeEach(() => {
    booking = { id: 'rad-1', state: 'IN_SCANNING', state_history: [], save: jest.fn(async () => booking), markModified: jest.fn() };
    const legacy = { findOne: jest.fn(async () => booking) };
    const center = { findOne: jest.fn(async () => null) };
    storage = { findOne: jest.fn() };
    service = new RadiologyOpsService({} as any, legacy as any, center as any, {} as any, {} as any, storage as any, {} as any, {} as any, { emit: jest.fn() } as any);
  });

  it('rejects a raw report URL before changing report state', async () => {
    await expect(service.uploadReport('rad-1', { id: 'provider-1', role: 'radiology' }, { pdf_url: 'https://untrusted.example/report.pdf' }))
      .rejects.toThrow(BadRequestException);
    expect(booking.save).not.toHaveBeenCalled();
    expect(booking.state).toBe('IN_SCANNING');
  });

  it('accepts only a private provider-owned PDF storage object', async () => {
    storage.findOne.mockReturnValue({ lean: async () => ({ id: 'storage-pdf-1', owner_account_id: 'provider-1', visibility: 'private', mime: 'application/pdf' }) });
    await expect(service.uploadReport('rad-1', { id: 'provider-1', role: 'radiology' }, { report_storage_object_id: 'storage-pdf-1', findings: 'Reviewed finding' }))
      .resolves.toBe(booking);
    expect(booking.report_storage_object_id).toBe('storage-pdf-1');
    expect(booking.signed_report_pdf_url).toBeUndefined();
    expect(booking.state).toBe('REPORT_DRAFT');
  });
});
