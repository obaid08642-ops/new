import { applyBackfill, governanceMissing, inheritedFilter, policies, rollbackBackfill } from '../../scripts/backfill-catalog-governance';

describe('smart catalog-governance backfill contract', () => {
  const medicine = policies.find((policy) => policy.name === 'medicines_master')!;
  const provider = policies.find((policy) => policy.name === 'provider_profiles')!;
  const facility = policies.find((policy) => policy.name === 'facilities')!;

  it('inherits public eligibility only from a verified legacy medicine', () => {
    expect(inheritedFilter(medicine)).toMatchObject({
      verified: true,
      is_deleted: { $ne: true },
      public_eligibility: { $exists: false },
      medical_review_status: { $exists: false },
    });
  });

  it('requires a provider license-verification signal in addition to operational active status', () => {
    expect(inheritedFilter(provider)).toMatchObject({
      status: 'active',
      $or: [{ license_verified: true }, { license_status: 'verified' }],
    });
  });

  it('has no inherited-public filter for facilities whose legacy state is operational only', () => {
    expect(inheritedFilter(facility)).toEqual({ ...governanceMissing, _id: { $exists: false } });
  });

  it('writes inherited approval first and then fail-closed pending rows without overwriting explicit governance', async () => {
    const collection = {
      updateMany: jest.fn().mockResolvedValueOnce({ matchedCount: 4, modifiedCount: 4 }).mockResolvedValueOnce({ matchedCount: 9, modifiedCount: 9 }),
    } as any;

    const result = await applyBackfill(collection, medicine);

    expect(collection.updateMany).toHaveBeenNthCalledWith(1, inheritedFilter(medicine), {
      $set: expect.objectContaining({ public_eligibility: true, indexing_eligibility: false, medical_review_status: 'approved', provenance: 'legacy_verification_inherited:medicine.verified' }),
    });
    expect(collection.updateMany).toHaveBeenNthCalledWith(2, governanceMissing, {
      $set: expect.objectContaining({ public_eligibility: false, medical_review_status: 'pending', provenance: 'legacy_backfill_pending_review' }),
    });
    expect(result).toEqual({ inherited_public: { matched: 4, modified: 4 }, pending_hidden: { matched: 9, modified: 9 } });
  });

  it('rollback targets only rows bearing migration provenance', async () => {
    const collection = { updateMany: jest.fn().mockResolvedValue({ matchedCount: 3, modifiedCount: 3 }) } as any;
    await rollbackBackfill(collection);
    expect(collection.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      provenance: { $in: expect.arrayContaining(['legacy_verification_inherited:medicine.verified', 'legacy_backfill_pending_review']) },
      catalog_governance_backfill_at: { $exists: true },
    }), expect.objectContaining({ $unset: expect.any(Object) }));
  });
});
