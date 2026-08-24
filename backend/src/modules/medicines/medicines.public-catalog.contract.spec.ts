import { BadRequestException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

function createService(rows: any[] = []) {
  const chain = { sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(rows) }) };
  const model: any = { find: jest.fn().mockReturnValue(chain) };
  const service = new MedicinesService(
    model, { emit: jest.fn() } as any, {} as any,
    { collection: jest.fn() } as any, { refresh: jest.fn() } as any,
  );
  return { service, model, chain };
}

describe('Public catalog fragment contract', () => {
  it('returns a bounded localized shard from indexed, reviewed public medicines only', async () => {
    const { service, model } = createService([{
      id: 'med-1', slug: 'paracetamol-med-1', name_ar: 'باراسيتامول', name_en: 'Paracetamol', category: 'medications',
      form: 'أقراص', strength: '500mg', price: 12, image: 'https://assets.example/med-1.png', requires_prescription: false,
      availability_status: 'none', translations: { tl: { name: 'Paracetamol Filipino', dosage_form: 'Tableta', strength: '500mg' } },
      public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved',
    }]);

    await expect(service.publicCatalogFragment('fil', 'medications')).resolves.toEqual([{
      id: 'med-1', slug: 'paracetamol-med-1', name: 'Paracetamol Filipino', category: 'medications', form: 'Tableta', strength: '500mg',
      price: 12, image: 'https://assets.example/med-1.png', requires_prescription: false, availability_status: 'none',
    }]);
    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({
      category: 'medications', is_deleted: { $ne: true }, public_eligibility: true,
      indexing_eligibility: true, medical_review_status: 'approved',
    }), expect.any(Object));
  });

  it('rejects an unsupported locale or unsafe category before querying the catalog', async () => {
    const { service, model } = createService();
    await expect(service.publicCatalogFragment('fr', 'medications')).rejects.toThrow(BadRequestException);
    await expect(service.publicCatalogFragment('ar', '../private')).rejects.toThrow(BadRequestException);
    expect(model.find).not.toHaveBeenCalled();
  });
});
