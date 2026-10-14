import { AdminPharmacyController } from './pharmacy.controllers';

// P13-R3: price-override audit history exists as JSON; the spec also requires CSV.
// Red test on the base: AdminPharmacyController has no priceOverridesExport yet.
describe('P13-R3 price-overrides CSV export', () => {
  function setup(rows: any[]) {
    const findCalls: any[] = [];
    const col = {
      find: jest.fn((filter: any) => {
        findCalls.push(filter);
        return { sort: () => ({ limit: () => ({ toArray: async () => rows }) }) };
      }),
    };
    const allocs = { orders: { db: { collection: jest.fn(() => col) } } };
    const ctl = new AdminPharmacyController({} as any, {} as any, allocs as any, {} as any, {} as any);
    return { ctl, col, findCalls };
  }

  it('exports the filtered audit rows as CSV with a header row', async () => {
    const rows = [
      {
        id: 'ov-1', order_id: 'o-1', offer_id: 'of-1', offer_version: 1,
        pharmacy_account_id: 'ph-1', order_item_id: 'it-1', sku: 'SKU-1',
        name_ar: 'دواء', name_en: 'Med, "quoted"',
        catalog_price: 10, override_price: 12, currency: 'SAR',
        reason: 'shortage', changed_by: 'ph-1', changed_at: new Date('2026-10-01T00:00:00.000Z'),
      },
    ];
    const { ctl, col, findCalls } = setup(rows);
    const csv: any = await (ctl as any).priceOverridesExport({ order_id: 'o-1' });
    expect(col.find).toHaveBeenCalledWith(expect.objectContaining({ order_id: 'o-1' }));
    expect(typeof csv).toBe('string');
    const lines = String(csv).split('\n');
    expect(lines[0]).toBe(
      'id,order_id,offer_id,offer_version,pharmacy_account_id,order_item_id,sku,name_ar,name_en,catalog_price,override_price,currency,reason,changed_by,changed_at',
    );
    expect(lines).toHaveLength(2);
    // Comma and quotes in name_en must be CSV-escaped, not break columns.
    expect(lines[1]).toContain('"Med, ""quoted"""');
    expect(findCalls).toHaveLength(1);
  });

  it('returns only the header row when there are no matching overrides', async () => {
    const { ctl } = setup([]);
    const csv: any = await (ctl as any).priceOverridesExport({});
    expect(String(csv).split('\n')).toHaveLength(1);
  });
});
