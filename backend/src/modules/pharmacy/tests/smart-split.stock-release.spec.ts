import { SmartSplitService } from '../services/smart-split.service';

function build(tracking: boolean) {
  const incs: any[] = [];
  const inv: any = {
    updateOne: jest.fn((q: any, u: any) => { incs.push({ q, u }); return Promise.resolve({}); }),
    model: { db: { collection: () => ({ findOne: async () => ({ inventory_tracking: tracking }) }) } },
  };
  const allocs: any = { updateOne: jest.fn(() => Promise.resolve({})) };
  const svc = new SmartSplitService({} as any, allocs, inv, {} as any, {} as any, {} as any, {} as any);
  return { svc, incs, allocs };
}
const alloc = (extra: any = {}) => ({
  id: 'a1', pharmacy_account_id: 'ph1',
  items: [{ action: 'available', inventory_id: 'inv1', qty_offered: 2 }], ...extra,
}) as any;

describe('SmartSplitService.releaseStockForAllocation: only give back stock that was taken', () => {
  it('no stock returned when the allocation never reserved (inventory tracking off)', async () => {
    const { svc, incs } = build(true);
    await svc.releaseStockForAllocation(alloc({ stock_reserved: false }));
    expect(incs).toHaveLength(0);
  });

  it('returns reserved stock once, then a second release is a no-op', async () => {
    const { svc, incs, allocs } = build(false);
    const a = alloc({ stock_reserved: true });
    await svc.releaseStockForAllocation(a);
    await svc.releaseStockForAllocation(a);
    expect(incs).toEqual([{ q: { id: 'inv1', provider_account_id: 'ph1' }, u: { $inc: { stock: 2 } } }]);
    expect(allocs.updateOne).toHaveBeenCalledWith({ id: 'a1' }, { $set: { stock_reserved: false } });
  });

  it('allocations from before the flag follow the pharmacy tracking setting', async () => {
    const off = build(false); await off.svc.releaseStockForAllocation(alloc());
    expect(off.incs).toHaveLength(0);
    const on = build(true); await on.svc.releaseStockForAllocation(alloc());
    expect(on.incs).toHaveLength(1);
  });
});
