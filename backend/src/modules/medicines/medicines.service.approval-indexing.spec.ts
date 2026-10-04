import { MedicinesService } from './medicines.service';

// Q60: admin create → medical-review approve must grant indexing_eligibility,
// otherwise the public filter (public_eligibility + indexing_eligibility +
// medical_review_status=approved) keeps the item 404 for everyone.
describe('MedicinesService medical approval indexing (Q60)', () => {
  const draft = {
    id: 'med-q60', name_ar: 'دواء', verified: true,
    public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending',
  };

  const createService = (med: any, request: any = null) => {
    const model = {
      findOne: jest.fn().mockImplementation(() => ({ lean: () => Promise.resolve(med ? { ...med } : null) })),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      create: jest.fn().mockImplementation((doc: any) => Promise.resolve({ id: 'med-new', ...doc })),
    };
    const changeRequests = {
      findOne: jest.fn().mockResolvedValue(request),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const systemEvents = { insertOne: jest.fn().mockResolvedValue({}) };
    const conn = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'catalog_change_requests') return changeRequests;
        return systemEvents;
      }),
    };
    const events = { emit: jest.fn() };
    const redis = { getClient: jest.fn().mockReturnValue(null) };
    const publication = { refresh: jest.fn().mockResolvedValue({}) };
    const service = new MedicinesService(model as any, events as any, redis as any, conn as any, publication as any);
    return { service, model, changeRequests, publication };
  };

  it('adminApproveCatalog(true) grants indexing_eligibility so the item goes public', async () => {
    const { service, model, publication } = createService(draft);

    const result = await service.adminApproveCatalog('med-q60', true, 'admin-1');

    expect(result).toEqual(expect.objectContaining({ ok: true, medical_review_status: 'approved' }));
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'med-q60' },
      expect.objectContaining({
        $set: expect.objectContaining({
          medical_review_status: 'approved',
          public_eligibility: true,
          indexing_eligibility: true,
          verified: true,
        }),
      }),
    );
    // The stored flags must jointly satisfy the public catalog filter.
    const setArg = (model.updateOne.mock.calls[0] as any[])[1].$set;
    expect({ ...draft, ...setArg }).toEqual(expect.objectContaining({
      public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved',
    }));
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'med-q60' }));
  });

  it('adminApproveCatalog(false) revokes indexability so a rejected item stays hidden', async () => {
    const { service, model } = createService({
      ...draft, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved',
    });

    await service.adminApproveCatalog('med-q60', false, 'admin-1');

    expect(model.updateOne).toHaveBeenCalledWith(
      { id: 'med-q60' },
      expect.objectContaining({
        $set: expect.objectContaining({
          medical_review_status: 'rejected',
          public_eligibility: false,
          indexing_eligibility: false,
        }),
      }),
    );
  });

  it('approving a new_item suggestion publishes the created medicine (not a draft)', async () => {
    const { service, model } = createService(null, {
      id: 'ccr_1', type: 'new_item', status: 'pending', medicine_id: null,
      changes: { name_ar: 'دواء جديد', description_ar: 'وصف' },
    });

    const result = await service.approveChangeRequest('ccr_1', 'admin-1', {});

    // R19 gives new items identity-based ids (UUID here — the fixture has no
    // sku/source/barcode), so pin the returned id instead of the mock's.
    // What matters is that THE SAME medicine gets published with all flags.
    const newId: string = (result as any)?.applied?.new_medicine_id;
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(typeof newId).toBe('string');
    expect(newId.length).toBeGreaterThan(0);
    expect(model.updateOne).toHaveBeenCalledWith(
      { id: newId },
      expect.objectContaining({
        $set: expect.objectContaining({
          medical_review_status: 'approved',
          public_eligibility: true,
          indexing_eligibility: true,
        }),
      }),
    );
  });
  // 300ce0c review: change-request approvals changed the medicine but never
  // refreshed the public projection, so a new item stayed out of public search
  // and a medicine removed as a duplicate stayed in it.
  it('approving a new_item refreshes the public projection of the created medicine', async () => {
    const { service, publication } = createService(null, {
      id: 'ccr_2', type: 'new_item', status: 'pending', medicine_id: null, changes: { name_ar: 'دواء جديد' },
    });
    const result: any = await service.approveChangeRequest('ccr_2', 'admin-1', {});
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'medicine', entityId: result.applied.new_medicine_id }));
  });

  it('approving a duplicate_remove refreshes the projection so the deleted copy leaves public search', async () => {
    const { service, publication } = createService({ ...draft, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved' }, {
      id: 'ccr_3', type: 'duplicate_remove', status: 'pending', medicine_id: 'med-q60', changes: {},
    });
    await service.approveChangeRequest('ccr_3', 'admin-1', {});
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'medicine', entityId: 'med-q60' }));
  });
});
