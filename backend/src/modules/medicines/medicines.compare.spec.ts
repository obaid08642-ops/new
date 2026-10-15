import { MedicinesService } from './medicines.service';

// batch-1a-web#8: compare returns the medicines a public product page shows; approval sets indexing_eligibility false
// (search-engine indexing only), so compare must not ask for it.
describe('MedicinesService.compare', () => {
  it('reads published, approved medicines without asking for search-engine indexing', async () => {
    let filter: any = null;
    const model: any = { find: (f: any) => { filter = f; return { lean: async () => [{ id: 'm1' }, { id: 'm2' }] }; } };
    const service = new MedicinesService(model, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await expect(service.compare(['m1', 'm2', 'm3', 'm4', 'm5'])).resolves.toHaveLength(2);
    expect(filter).toEqual({ id: { $in: ['m1', 'm2', 'm3', 'm4'] }, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' });
  });
});
