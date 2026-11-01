import { LabsService } from './labs.service';

// X2: the app uploads a report in three calls; a retry with the same stored file must not add a second report.
describe('lab upload-report retried', () => {
  it('the same stored file again returns the booking and emits nothing', async () => {
    const booking: any = { id: 'b1', state: 'REPORTED', provider_account_id: 'lab-1', reports: [{ id: 'r1', storage_object_id: 'so-1' }], save: jest.fn(), toObject() { return { id: 'b1', reports: this.reports }; } };
    const svc: any = Object.create(LabsService.prototype);
    svc.bkgModel = { findOne: async () => booking };
    svc.storage = { providerReportObject: jest.fn(async () => ({ id: 'so-1', mime: 'application/pdf' })) };
    svc.events = { emit: jest.fn() };
    const out = await svc.uploadReport('b1', { id: 'lab-1', role: 'lab' }, { report_storage_object_id: 'so-1' });
    expect(out.reports).toHaveLength(1);
    expect(booking.save).not.toHaveBeenCalled();
    expect(svc.events.emit).not.toHaveBeenCalled();
  });
});
