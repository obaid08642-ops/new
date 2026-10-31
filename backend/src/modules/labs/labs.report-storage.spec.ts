/** G4: a lab report file reaches a result only through /storage (owned, private, scanned); no raw base64 or link; the patient reads it through the booking route. */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LabsService, reportSummary } from './labs.service';

const lab = { id: 'lab-1', role: 'lab' };
const mk = () => {
  const booking: any = { id: 'bk-1', patient_id: 'pat-1', provider_account_id: 'lab-1', state: 'RESULT_UPLOADED', reports: [], state_history: [], save: jest.fn(async () => booking), toObject: () => booking };
  const storage: any = {
    providerReportObject: jest.fn(async (id: string) => ({ id, mime: 'application/pdf', original_name: 'scan.pdf' })),
    fileBytes: jest.fn(async () => ({ mime: 'application/pdf', data: Buffer.from('%PDF stored'), name: 'scan.pdf' })),
  };
  const s: any = Object.create(LabsService.prototype);
  s.bkgModel = { findOne: (_q?: any, proj?: any) => (proj ? { lean: async () => ({ ...booking }) } : Promise.resolve(booking)) };
  s.storage = storage;
  s.events = { emit: jest.fn() };
  s.engine = { apply: jest.fn(async (a: any) => a.mutate()) };
  return { s: s as LabsService, booking, storage };
};

describe('lab report upload through /storage', () => {
  it('stores the scanned file id on the report, not the bytes', async () => {
    const { s, booking, storage } = mk();
    await s.uploadReport('bk-1', lab, { report_storage_object_id: 'obj-1' } as any);
    expect(storage.providerReportObject).toHaveBeenCalledWith('obj-1', 'lab-1', expect.any(Set));
    expect(booking.reports).toHaveLength(1);
    expect(booking.reports[0]).toMatchObject({ storage_object_id: 'obj-1', mime: 'application/pdf', name: 'scan.pdf', uploaded_by: 'lab-1' });
    expect(booking.reports[0].base64).toBeUndefined();
    expect(booking.state).toBe('REPORTED');
  });

  it('refuses raw base64 and raw links', async () => {
    const { s, booking } = mk();
    await expect(s.uploadReport('bk-1', lab, { base64: 'AAAA' } as any)).rejects.toThrow('raw_report_file_not_allowed');
    await expect(s.uploadReport('bk-1', lab, { url: 'https://x.example/r.pdf' } as any)).rejects.toThrow('raw_report_file_not_allowed');
    expect(booking.reports).toHaveLength(0);
  });

  it('refuses a file that is not the lab\'s own or still in quarantine, and changes nothing', async () => {
    const { s, booking, storage } = mk();
    storage.providerReportObject.mockRejectedValueOnce(new ForbiddenException('private_storage_object_not_owned'));
    await expect(s.uploadReport('bk-1', lab, { report_storage_object_id: 'someone-elses' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    storage.providerReportObject.mockRejectedValueOnce(Object.assign(new Error('locked'), { status: 423 }));
    await expect(s.uploadReport('bk-1', lab, { report_storage_object_id: 'pending' } as any)).rejects.toMatchObject({ status: 423 });
    expect(booking.save).not.toHaveBeenCalled();
    expect(booking.state).toBe('RESULT_UPLOADED');
  });

  it('needs a file or typed rows', async () => {
    const { s } = mk();
    await expect(s.uploadReport('bk-1', lab, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists a stored report as having a file and serves its bytes to the patient only', async () => {
    const { s, booking, storage } = mk();
    booking.reports = [{ id: 'r-1', name: 'scan.pdf', mime: 'application/pdf', storage_object_id: 'obj-1' }];
    expect(reportSummary(booking.reports[0]).has_file).toBe(true);
    const f = await s.reportFile('bk-1', 'r-1', { id: 'pat-1', role: 'patient' });
    expect(storage.fileBytes).toHaveBeenCalledWith('obj-1');
    expect(f.data.toString()).toBe('%PDF stored');
    await expect(s.reportFile('bk-1', 'r-1', { id: 'pat-2', role: 'patient' })).rejects.toThrow();
  });
});
