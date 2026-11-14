import { MedicinesService } from './medicines.service';

/** Gap 12: the pharmacy's suggested change can carry the Arabic and English storage conditions the app edits. */
describe('MedicinesService.EDITABLE_FIELDS', () => {
  it('has the localised storage conditions next to the plain one', () => {
    const f = (MedicinesService as any).EDITABLE_FIELDS as string[];
    expect(f).toEqual(expect.arrayContaining(['storage_conditions', 'storage_conditions_ar', 'storage_conditions_en']));
  });
  it('still holds none of the governance fields (identity, status, verification, ownership)', () => {
    const f = (MedicinesService as any).EDITABLE_FIELDS as string[];
    for (const k of ['id', 'status', 'verified', 'verification_status', 'created_by', 'owner_id', 'covered_by_insurance']) expect(f).not.toContain(k);
  });
});
