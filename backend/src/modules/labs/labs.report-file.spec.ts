/** journeys#54: a lab report is opened by its id on its own route; the booking lists reports without their file. */
import { NotFoundException } from '@nestjs/common';
import { LabsService, reportSummary } from './labs.service';

const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
const booking = { id: 'bk-1', patient_id: 'pat-1', provider_account_id: 'lab-1', reports: [{ id: 'r-1', name: 'report.pdf', mime: 'application/pdf', base64: pdf, uploaded_at: new Date('2026-10-15') }, { id: 'r-2', name: 'link', url: 'https://cdn.example.test/x.pdf' }] };
const svc = () => {
  const s: any = Object.create(LabsService.prototype);
  const resultDocs = [{ id: 'res-1', reported_at: new Date('2026-10-16T10:00:00Z'), critical: true, entries: [{ name: 'Hemoglobin', value: 13.5, unit: 'g/dL', ref_low: 12, ref_high: 16, flag: 'normal' }, { name: 'Potassium', value: '6.9', unit: 'mmol/L', range: '3.5-5.1', flag: 'critical' }, { value: 1 }, { name: { $ne: 1 } }] }];
  s.bkgModel = {
    findOne: () => ({ lean: async () => JSON.parse(JSON.stringify(booking)) }),
    db: { collection: (n: string) => ({ find: (q: any) => { s.lastResultQuery = { n, q }; return { sort: () => ({ limit: () => ({ toArray: async () => resultDocs }) }) }; } }) },
  };
  return s as LabsService;
};

describe('lab report file (journeys#54)', () => {
  it('the booking lists each report by id and name, with no file content', async () => {
    const b: any = await svc().getBooking('bk-1', { id: 'pat-1', role: 'patient' });
    expect(b.reports).toEqual([
      expect.objectContaining({ id: 'r-1', name: 'report.pdf', has_file: true }),
      expect.objectContaining({ id: 'r-2', has_file: false }),
    ]);
    expect(JSON.stringify(b)).not.toContain(pdf);
    expect(reportSummary({ id: 'x', base64: 'abc' })).not.toHaveProperty('base64');
  });

  it('the booking carries the typed values as results[], for this booking and patient only, primitives only', async () => {
    const inst: any = svc();
    const b: any = await inst.getBooking('bk-1', { id: 'pat-1', role: 'patient' });
    expect(inst.lastResultQuery.n).toBe('labresults');
    expect(inst.lastResultQuery.q).toMatchObject({ booking_id: 'bk-1', patient_id: 'pat-1' });
    expect(b.results).toEqual([
      { result_id: 'res-1', name: 'Hemoglobin', value: 13.5, unit: 'g/dL', ref_low: 12, ref_high: 16, range: null, flag: 'normal', reported_at: '2026-10-16T10:00:00.000Z', critical: true },
      { result_id: 'res-1', name: 'Potassium', value: '6.9', unit: 'mmol/L', ref_low: null, ref_high: null, range: '3.5-5.1', flag: 'critical', reported_at: '2026-10-16T10:00:00.000Z', critical: true },
    ]);
  });

  it('serves the file to the patient and the assigned lab, and to no one else', async () => {
    const file = await svc().reportFile('bk-1', 'r-1', { id: 'pat-1', role: 'patient' });
    expect(file.mime).toBe('application/pdf');
    expect(file.data.toString()).toBe('%PDF-1.4 test');
    await expect(svc().reportFile('bk-1', 'r-1', { id: 'lab-1', role: 'lab' })).resolves.toBeTruthy();
    await expect(svc().reportFile('bk-1', 'r-1', { id: 'pat-2', role: 'patient' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc().reportFile('bk-1', 'r-2', { id: 'pat-1', role: 'patient' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc().reportFile('bk-1', 'nope', { id: 'pat-1', role: 'patient' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
