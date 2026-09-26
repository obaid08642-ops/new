import { LabsService } from './labs.service';

/** P6.0: medical-review decision sets governance fields + audit event. */
describe('LabsService.approveCatalogItem', () => {
  const make = () => {
    const svcModel: any = { findOneAndUpdate: jest.fn().mockResolvedValue({ id: 't1' }) };
    const bus: any = { emit: jest.fn().mockResolvedValue({ duplicate: false }) };
    const svc = new LabsService(svcModel, {} as any, {} as any, {} as any, {} as any, bus, {} as any, {} as any, undefined);
    return { svc, svcModel, bus };
  };

  it('approve sets approved + public_eligibility and emits audit event', async () => {
    const { svc, svcModel, bus } = make();
    await svc.approveCatalogItem({ id: 'a1', role: 'admin' }, 't1', true);
    expect(svcModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: { $eq: 't1' } },
      { $set: expect.objectContaining({ medical_review_status: 'approved', public_eligibility: true }) },
      { new: true },
    );
    expect(bus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'catalog.service_approved', entity_id: 't1' }));
  });

  it('reject sets rejected + not public', async () => {
    const { svc, svcModel } = make();
    await svc.approveCatalogItem({ id: 'a1', role: 'admin' }, 't1', false);
    expect(svcModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { $set: expect.objectContaining({ medical_review_status: 'rejected', public_eligibility: false }) },
      { new: true },
    );
  });

  it('non-admin cannot decide; bulk caps at 200 with per-id results', async () => {
    const { svc } = make();
    await expect(svc.approveCatalogItem({ id: 'x', role: 'lab' }, 't1', true)).rejects.toThrow();
    const ids = Array.from({ length: 250 }, (_, i) => `t${i}`);
    const res: any = await svc.bulkApproveCatalog({ id: 'a1', role: 'admin' }, ids, true);
    expect(res.results).toHaveLength(200);
    expect(res.results.every((r: any) => r.ok)).toBe(true);
  });
});
