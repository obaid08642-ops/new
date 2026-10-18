/** journeys#54: a lab report is opened by its id on its own route; the booking lists reports without their file. */
import { NotFoundException } from '@nestjs/common';
import { LabsService, reportSummary } from './labs.service';

const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
const booking = { id: 'bk-1', patient_id: 'pat-1', provider_account_id: 'lab-1', reports: [{ id: 'r-1', name: 'report.pdf', mime: 'application/pdf', base64: pdf, uploaded_at: new Date('2026-10-15') }, { id: 'r-2', name: 'link', url: 'https://cdn.example.test/x.pdf' }] };
const svc = () => {
  const s: any = Object.create(LabsService.prototype);
  s.bkgModel = { findOne: () => ({ lean: async () => JSON.parse(JSON.stringify(booking)) }) };
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
