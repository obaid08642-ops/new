import { MedicinesService } from './medicines.service';

describe('MedicinesService catalog governance', () => {
  const createService = (medicine: any) => {
    const model = {
      findOne: jest.fn().mockResolvedValue(medicine),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const events = { emit: jest.fn() };
    const redis = { getClient: jest.fn().mockReturnValue(null) };
    const collection = { insertOne: jest.fn().mockResolvedValue({}) };
    const conn = { collection: jest.fn().mockReturnValue(collection) };
    const publication = { refresh: jest.fn().mockResolvedValue({}) };
    const service = new MedicinesService(model as any, events as any, redis as any, conn as any, publication as any);
    return { service, model };
  };

  it('withdraws a public medicine after direct content editing', async () => {
    const { service, model } = createService({
      id: 'med-1', name_ar: 'دواء', description_ar: 'قبل', images: [],
      public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved',
    });

    const result = await service.adminUpdateCatalog('med-1', { description_ar: 'بعد' }, 'admin-1');

    expect(result).toEqual(expect.objectContaining({ ok: true, requires_reapproval: true }));
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'med-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          description_ar: 'بعد', verified: false, public_eligibility: false,
          indexing_eligibility: false, medical_review_status: 'pending',
          provenance: 'admin_direct_edit_pending_review',
        }),
      }),
    );
  });

  it('does not promote a draft as a side effect of editing it', async () => {
    const { service, model } = createService({
      id: 'med-2', name_ar: 'مسودة', description_ar: 'قبل', images: [],
      public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending',
    });

    const result = await service.adminUpdateCatalog('med-2', { description_ar: 'بعد' }, 'admin-1');

    expect(result).toEqual(expect.objectContaining({ ok: true, requires_reapproval: false }));
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'med-2' },
      expect.objectContaining({ $set: expect.not.objectContaining({ provenance: 'admin_direct_edit_pending_review' }) }),
    );
  });
});
