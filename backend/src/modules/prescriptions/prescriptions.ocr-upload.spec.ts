import { PrescriptionsService } from './prescriptions.service';

// Needs-review #497: a line straight from POST /ai/prescription-ocr ({raw_name_string, requested_quantity})
// is kept, not silently dropped.
describe('PrescriptionsService.uploadByPatient with OCR lines', () => {
  it('stores the OCR name and quantity', async () => {
    const created: any[] = [];
    const model = { create: jest.fn(async (doc: any) => { created.push(doc); return { ...doc, id: 'rx-1', toObject: () => doc }; }) };
    const medicines = { createManualEntry: jest.fn() };
    const service = new PrescriptionsService(model as any, medicines as any, { emit: jest.fn() } as any, {} as any, {} as any);
    await service.uploadByPatient({ id: 'patient-1', role: 'patient' }, {
      upload_image: 'storage-1',
      items: [{ medicine_id: 'med-1', raw_name_string: 'Amoxicillin 500', requested_quantity: 2, notes: '' }],
    });
    expect(created[0].items).toEqual([expect.objectContaining({ medicine_id: 'med-1', medicine_name_ar: 'Amoxicillin 500', quantity: 2 })]);
    expect(medicines.createManualEntry).not.toHaveBeenCalled();
  });
});
