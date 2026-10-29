import { isInternalCatalogField, toPublicCatalogRow } from './public-catalog-row';

describe('toPublicCatalogRow', () => {
  it('drops audit, soft-delete and machine-edit fields and keeps the rest', () => {
    const row = { _id: 1, __v: 0, id: 'a', code: 'X', name_ar: 'أ', price: 5, created_by: 'u', updated_by: 'u', deleted_at: null, deleted_by: null, is_deleted: false, reviewed_by: 'r', machine_moved: true, createdAt: 'c', updatedAt: 'u', medical_review_status: 'approved', public_eligibility: true };
    expect(toPublicCatalogRow(row)).toEqual({ id: 'a', code: 'X', name_ar: 'أ', price: 5, createdAt: 'c', updatedAt: 'u', medical_review_status: 'approved', public_eligibility: true });
  });
  it('is shape-based: a future *_by field is internal, a normal field is not', () => {
    for (const k of ['approved_by', 'merged_by', 'machine_translated']) expect(isInternalCatalogField(k)).toBe(true);
    for (const k of ['price', 'name_ar', 'duration', 'image_url', 'sort', 'by_gender', 'category']) expect(isInternalCatalogField(k)).toBe(false);
  });
});
