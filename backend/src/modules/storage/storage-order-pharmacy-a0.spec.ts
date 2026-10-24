import { ForbiddenException } from '@nestjs/common';
import { StorageService } from './storage.module';
import { UploadSecurityService } from './upload-security.service';

// A-0: only a pharmacy notified about (or allocated) the order that carries the file may open it.
function make(opts: { recipients?: string[]; allocations?: string[]; radiology?: { patient: string; state: string } }) {
  const file: any = { id: 'f1', owner_account_id: 'pat-1', visibility: 'private', mime: 'image/jpeg', original_name: 'rx.jpg', size_bytes: 1, backend: 'base64', data_base64: 'eA==' };
  const coll = (name: string): any => ({
    // the order carries the file as a prescription attachment or as the photo of a box (journeys 74): either clause
    find: (q: any) => ({ limit: () => ({ toArray: async () => (name === 'pharmacy_orders' && q.patient_account_id.$eq === 'pat-1' && (q.$or || []).some((c: any) => (c['prescription_attachments.uri'] || c['items.photo_uri'])?.$eq === '/api/v1/storage/f1') ? [{ id: 'ord-1' }] : []) }) }),
    findOne: async (q: any) => {
      if (name === 'radiologybookings') return opts.radiology && q.patient_id.$eq === opts.radiology.patient && q.state.$eq === opts.radiology.state && (q.$or || []).some((c: any) => Object.values(c).some((v: any) => v.$eq === 'f1')) ? { _id: 1 } : null;
      const list = name === 'pharmacy_broadcast_recipients' ? opts.recipients || [] : name === 'pharmacy_allocations' ? opts.allocations || [] : [];
      return q.order_id.$in.includes('ord-1') && list.includes(q.pharmacy_account_id.$eq) ? { _id: 1 } : null;
    },
  });
  const model: any = { findOne: jest.fn(async () => file), db: { collection: coll } };
  const svc: any = new StorageService(model, new UploadSecurityService());
  svc.adapter = { get: async () => ({ data_base64: 'eA==' }) };
  return svc as StorageService;
}

describe('prescription files and pharmacies (A-0)', () => {
  it('a notified pharmacy reads it; an allocated one too', async () => {
    await expect(make({ recipients: ['ph-1'] }).read('f1', { id: 'ph-1', role: 'pharmacy' })).resolves.toMatchObject({ id: 'f1' });
    await expect(make({ allocations: ['ph-2'] }).read('f1', { id: 'ph-2', role: 'pharmacy' })).resolves.toMatchObject({ id: 'f1' });
  });
  it('any other pharmacy or user gets 403; the owner still reads it', async () => {
    await expect(make({ recipients: ['ph-1'] }).read('f1', { id: 'ph-9', role: 'pharmacy' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({}).read('f1', { id: 'pat-2', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({}).read('f1', { id: 'pat-1', role: 'patient' })).resolves.toMatchObject({ id: 'f1' });
  });
});

// #1819: the patient of a radiology booking opens the report files once the report is published, and no one else.
describe('radiology report files and the patient (#1819)', () => {
  it('the booking patient reads a published report file; before publishing, or another patient, gets 403', async () => {
    await expect(make({ radiology: { patient: 'pat-7', state: 'REPORT_READY' } }).read('f1', { id: 'pat-7', role: 'patient' })).resolves.toMatchObject({ id: 'f1' });
    await expect(make({ radiology: { patient: 'pat-7', state: 'UNDER_REVIEW' } }).read('f1', { id: 'pat-7', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({ radiology: { patient: 'pat-7', state: 'REPORT_READY' } }).read('f1', { id: 'pat-8', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
