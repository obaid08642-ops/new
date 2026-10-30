import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';

describe('RadiologyOpsService secure report storage', () => {
  let service: any;
  let booking: any;
  let storage: any;
  let bkgModel: any;
  let centerBkgModel: any;

  beforeEach(() => {
    booking = { 
      id: 'rad-1', 
      state: 'IN_SCANNING', 
      state_history: [], 
      provider_account_id: 'provider-1',
      save: jest.fn(async () => booking), 
      markModified: jest.fn() 
    };
    bkgModel = { findOne: jest.fn(async () => booking) };
    centerBkgModel = { findOne: jest.fn(async () => null) };
    storage = { findOne: jest.fn() };
    service = new RadiologyOpsService(
      {} as any, 
      bkgModel as any, 
      centerBkgModel as any, 
      {} as any, 
      {} as any, 
      storage as any, 
      {} as any, // ProviderProfile
      {} as any, 
      { emit: jest.fn() } as any
    );
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

  it('rejects report upload when provider does not own the booking', async () => {
    const otherProviderBooking = { 
      ...booking, 
      id: 'rad-2', 
      provider_account_id: 'other-provider',
      state: 'IN_SCANNING',
      state_history: [],
      save: jest.fn(async () => otherProviderBooking),
      markModified: jest.fn()
    };
    bkgModel.findOne.mockResolvedValueOnce(otherProviderBooking);
    storage.findOne.mockReturnValue({ lean: async () => ({ id: 'storage-pdf-1', owner_account_id: 'provider-1', visibility: 'private', mime: 'application/pdf' }) });
    
    await expect(service.uploadReport('rad-2', { id: 'provider-1', role: 'radiology' }, { report_storage_object_id: 'storage-pdf-1', findings: 'Reviewed finding' }))
      .rejects.toThrow(NotFoundException);
  });

  it('refuses a report file that is still in quarantine', async () => {
    storage.findOne.mockReturnValue({ lean: async () => ({ id: 'storage-pdf-1', owner_account_id: 'provider-1', visibility: 'private', mime: 'application/pdf', scan_status: 'pending_scan' }) });
    await expect(service.uploadReport('rad-1', { id: 'provider-1', role: 'radiology' }, { report_storage_object_id: 'storage-pdf-1' }))
      .rejects.toMatchObject({ status: 423 });
    expect(booking.save).not.toHaveBeenCalled();
  });

  describe('approveReport: two people', () => {
    const history = (by: string, to: string) => ({ from: 'X', to, by_user_id: by, by_role: 'radiology', at: new Date() });
    it('refuses the user who uploaded the files', async () => {
      booking.state = 'UNDER_REVIEW';
      booking.state_history = [history('tech-1', 'REPORT_DRAFT'), history('tech-2', 'UNDER_REVIEW')];
      await expect(service.approveReport('rad-1', { id: 'tech-1', account_id: 'provider-1', role: 'radiology' })).rejects.toThrow('report_reviewer_must_differ_from_uploader');
      expect(booking.state).toBe('UNDER_REVIEW');
    });
    it('refuses the user who sent it for review', async () => {
      booking.state = 'UNDER_REVIEW';
      booking.state_history = [history('tech-1', 'REPORT_DRAFT'), history('tech-2', 'UNDER_REVIEW')];
      await expect(service.approveReport('rad-1', { id: 'tech-2', account_id: 'provider-1', role: 'radiology' })).rejects.toThrow('report_reviewer_must_differ_from_uploader');
    });
    it('lets a different user publish', async () => {
      booking.state = 'UNDER_REVIEW';
      booking.state_history = [history('tech-1', 'REPORT_DRAFT'), history('tech-1', 'UNDER_REVIEW')];
      await service.approveReport('rad-1', { id: 'reviewer-9', account_id: 'provider-1', role: 'radiology' });
      expect(booking.state).toBe('REPORT_READY');
      expect(booking.report_approved_by).toBe('reviewer-9');
    });
  });
});
