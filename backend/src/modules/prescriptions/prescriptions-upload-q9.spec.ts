/** Q-9: OCR field names (raw_name_string / requested_quantity) are saved, not dropped. */
import { PrescriptionsService } from './prescriptions.service';

describe('Q-9 OCR item mapping', () => {
  it('saves OCR items sent as raw_name_string + requested_quantity', async () => {
    let saved: any = null;
    const model: any = { create: async (d: any) => { saved = d; return { ...d, id: 'rx-1', toObject: () => ({ ...d, id: 'rx-1' }) }; } };
    const medicines: any = { createManualEntry: async () => ({ id: 'med-1' }) };
    const svc = new (PrescriptionsService as any)(model, medicines, { emit: () => undefined }, {}, {});
    const out: any = await svc.uploadByPatient(
      { id: 'pat-1', role: 'patient' },
      {
        upload_image: 'data:image/jpeg;base64,x',
        items: [{ medicine_id: null, raw_name_string: 'Panadol', requested_quantity: 2, notes: 'from OCR' }],
        notes: 'tag',
      },
    );
    expect(out.items).toHaveLength(1);
    expect(out.items[0].medicine_name_ar).toBe('Panadol');
    expect(out.items[0].quantity).toBe(2);
    expect(saved.items).toHaveLength(1);
  });
});
