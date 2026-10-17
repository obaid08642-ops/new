import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ScanImageDto } from './scanner.dto';
import { parseScanReading, rankScanMatches, SCAN_PROMPT, ScannerService } from './scanner.service';
import { MedicinesService } from '../medicines/medicines.service';

const IMAGE = 'A'.repeat(400);
const rows = [
  { id: 'm-1', name_en: 'Panadol Extra', strength: '500 mg', form: 'tablet', requires_prescription: false },
  { id: 'm-2', name_en: 'Panadol', strength: '500 mg', form: 'tablet', requires_prescription: false },
  { id: 'm-3', name_en: 'Panadol', strength: '250 mg', form: 'syrup', requires_prescription: false },
];

function build(modelText: string) {
  const gateway = { generate: jest.fn().mockResolvedValue({ text: modelText }) };
  const ai = { prescriptionOcr: jest.fn().mockResolvedValue({ items: [{ raw_name_string: 'Augmentin', requested_quantity: 1 }] }) };
  const medicines = { publicScanCandidates: jest.fn().mockResolvedValue(rows) };
  const prescriptions = { uploadByPatient: jest.fn().mockResolvedValue({ id: 'rx-9' }) };
  const svc = new ScannerService(gateway as never, ai as never, medicines as never, prescriptions as never);
  return { svc, gateway, ai, medicines, prescriptions };
}

describe('AI scanner (decision 36)', () => {
  const user = { id: 'patient-1', role: 'patient' };

  it('sends the photo to the vision model through the gateway with the strict JSON prompt', async () => {
    const { svc, gateway } = build('{"kind":"pack","name":"Panadol","strength":"500 mg","form":"tablet","confidence":0.9}');
    await svc.scan(user, `data:image/png;base64,${IMAGE}`);
    expect(gateway.generate).toHaveBeenCalledWith({ prompt: SCAN_PROMPT, feature: 'aiScanner', imageBase64: IMAGE, mimeType: 'image/png' });
  });

  it('a pack: searches the public catalogue and returns the closest matches ranked by name, strength and form', async () => {
    const { svc, medicines, prescriptions } = build('{"kind":"pack","name":"Panadol","strength":"500 mg","form":"tablet","confidence":0.9}');
    const out = await svc.scan(user, IMAGE);
    expect(medicines.publicScanCandidates).toHaveBeenCalledWith('Panadol', 25);
    expect(out.kind).toBe('pack');
    expect(out.matches.map((m) => m.id)).toEqual(['m-2', 'm-1', 'm-3']);
    expect(prescriptions.uploadByPatient).not.toHaveBeenCalled();
  });

  it('a barcode or QR photo is searched by the name printed beside it', async () => {
    const { svc, medicines } = build('{"kind":"barcode","name":"Panadol","strength":null,"form":null,"confidence":0.7}');
    const out = await svc.scan(user, IMAGE);
    expect(out.kind).toBe('barcode');
    expect(medicines.publicScanCandidates).toHaveBeenCalledTimes(1);
  });

  it('a prescription: no purchasable items, the normal prescription flow (OCR then the patient upload with the photo)', async () => {
    const { svc, ai, medicines, prescriptions } = build('{"kind":"prescription","name":null,"strength":null,"form":null,"confidence":0.95}');
    const out = await svc.scan(user, IMAGE);
    expect(medicines.publicScanCandidates).not.toHaveBeenCalled();
    expect(ai.prescriptionOcr).toHaveBeenCalledWith(IMAGE);
    expect(prescriptions.uploadByPatient).toHaveBeenCalledWith(user, expect.objectContaining({ upload_image: `data:image/jpeg;base64,${IMAGE}`, items: [{ raw_name_string: 'Augmentin', requested_quantity: 1 }] }));
    expect(out).toEqual({ kind: 'prescription', status: 'saved', prescription_id: 'rx-9', route: '/pharmacy/rx-order?prescriptionId=rx-9', matches: [] });
  });

  it('a prescription the OCR cannot read is not saved', async () => {
    const { svc, ai, prescriptions } = build('{"kind":"prescription","confidence":0.8}');
    ai.prescriptionOcr.mockResolvedValue({ items: [] });
    const out = await svc.scan(user, IMAGE);
    expect(out).toMatchObject({ kind: 'prescription', status: 'unreadable', prescription_id: null });
    expect(prescriptions.uploadByPatient).not.toHaveBeenCalled();
  });

  it('a low-confidence reading offers no matches', async () => {
    const { svc, medicines } = build('{"kind":"pack","name":"Pan","confidence":0.1}');
    const out = await svc.scan(user, IMAGE);
    expect(out.matches).toEqual([]);
    expect(medicines.publicScanCandidates).not.toHaveBeenCalled();
  });

  it('a model answer that is not the strict JSON is refused (422), never guessed', async () => {
    for (const text of ['Panadol 500', '{"kind":"food","name":"x","confidence":0.9}', '{"kind":"pack","name":"x","confidence":7}', '[]']) {
      const { svc } = build(text);
      await expect(svc.scan(user, IMAGE)).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
    expect(parseScanReading('```json\n{"kind":"qr","name":"Brufen","confidence":0.5,"extra":"dropped"}\n```')).toMatchObject({ kind: 'qr', name: 'Brufen' });
  });

  it('rankScanMatches keeps at most five matches', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `x${i}`, name_en: `Panadol ${i}` }));
    expect(rankScanMatches(many, { name: 'Panadol' })).toHaveLength(5);
  });

  it('the request DTO refuses a non-image type and a non-base64 body', () => {
    const bad = (body: object) => validateSync(plainToInstance(ScanImageDto, body)).length > 0;
    expect(bad({ image_base64: IMAGE })).toBe(false);
    expect(bad({ image_base64: `data:image/jpeg;base64,${IMAGE}` })).toBe(false);
    expect(bad({ image_base64: 'data:application/pdf;base64,AAAA' })).toBe(true);
    expect(bad({ image_base64: IMAGE, mime_type: 'image/gif' })).toBe(true);
    expect(bad({})).toBe(true);
  });

  it('publicScanCandidates searches only the public catalogue', async () => {
    const chain = { sort: jest.fn(), maxTimeMS: jest.fn(), limit: jest.fn() };
    chain.sort.mockReturnValue(chain);
    chain.maxTimeMS.mockReturnValue(chain);
    chain.limit.mockResolvedValue([{ id: 'm-2', name_en: 'Panadol', price: 10 }]);
    const model = { find: jest.fn().mockReturnValue(chain) };
    const svc = new MedicinesService(model as never, {} as never, {} as never, {} as never, {} as never);
    const out = await svc.publicScanCandidates('Pana(dol', 25);
    const query = model.find.mock.calls[0][0];
    expect(query).toMatchObject({ is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' });
    expect(query.$or[0].name_en.$regex).toBe('Pana\\(dol');
    expect(out[0].id).toBe('m-2');
  });
});
