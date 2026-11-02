import { PharmacyAllocationService, pharmacySettlementGross } from './pharmacy-allocation.service';

/**
 * Owner decision 2026-11-02, by the order's delivery mode (stored on the order at checkout from the chosen offer):
 *  - 'platform' (default): the platform sets the fee and keeps it: outside the pharmacy's gross; with COD the pharmacy owes it
 *  - 'pharmacy_own': the pharmacy's own couriers and own fee: part of the pharmacy's gross, commission by the usual rules
 */
const alloc = (mode?: string, over: any = {}) => ({ id: 'al1', order_id: 'o1', pharmacy_account_id: 'ph1', totals: { subtotal: 100, delivery_fee: 15, total: 115 }, ...(mode ? { fulfillment: { delivery_mode: mode } } : {}), ...over });

describe('pharmacySettlementGross', () => {
  it('platform delivery: the pharmacy\'s gross is the items, the platform keeps the fee', () => {
    expect(pharmacySettlementGross(alloc('platform'))).toEqual({ gross: 100, platformDeliveryFee: 15, delivery_mode: 'platform' });
  });
  it('no mode stored (older orders) = platform', () => {
    expect(pharmacySettlementGross(alloc())).toEqual({ gross: 100, platformDeliveryFee: 15, delivery_mode: 'platform' });
  });
  it('the order\'s mode is read when the allocation has none', () => {
    expect(pharmacySettlementGross(alloc(), { delivery_mode: 'pharmacy_own' })).toEqual({ gross: 115, platformDeliveryFee: 0, delivery_mode: 'pharmacy_own' });
  });
  it('pharmacy with its own couriers: the fee is the pharmacy\'s, in its gross', () => {
    expect(pharmacySettlementGross(alloc('pharmacy_own'))).toEqual({ gross: 115, platformDeliveryFee: 0, delivery_mode: 'pharmacy_own' });
  });
  it('no delivery fee: unchanged in both modes', () => {
    const t = { subtotal: 100, delivery_fee: 0, total: 100 };
    expect(pharmacySettlementGross(alloc('platform', { totals: t })).gross).toBe(100);
    expect(pharmacySettlementGross(alloc('pharmacy_own', { totals: t })).gross).toBe(100);
  });
});

describe('settleDeliveredAllocation', () => {
  function run(a: any, isCod: boolean, orderMode?: string) {
    const rows: any[] = [];
    const svc: any = Object.create(PharmacyAllocationService.prototype);
    const cols: Record<string, any> = {
      platformledgerentries: { findOne: async () => null, insertOne: async (r: any) => { rows.push(r); } },
      finance_config: { findOne: async () => ({ service_types: { pharmacy: { percent: 10 } }, tax: { vat_percent: 15 } }) },
      pharmacy_orders: { findOne: async () => (orderMode ? { delivery_mode: orderMode } : null) },
    };
    svc.orders = { db: { collection: (n: string) => cols[n] } };
    return svc.settleDeliveredAllocation(a, isCod).then(() => rows);
  }
  describe('platform delivery', () => {
    it('paid online: commission and VAT on the items only; the pharmacy is credited 100 - 10 - 1.5, not the delivery fee', async () => {
      const [row] = await run(alloc('platform'), false);
      expect(row).toMatchObject({ type: 'provider_earning', gross: 100, commission: 10, vat: 1.5, amount: 88.5, platform_delivery_fee: 15, delivery_mode: 'platform' });
    });
    it('cash on delivery: the pharmacy owes commission + VAT + the delivery fee it collected for the platform', async () => {
      const [row] = await run(alloc('platform'), true);
      expect(row).toMatchObject({ type: 'provider_debit', gross: 100, commission: 10, vat: 1.5, platform_delivery_fee: 15, amount: 26.5 });
    });
  });
  describe('pharmacy with its own couriers', () => {
    it('paid online: the fee is the pharmacy\'s: commission on 115 (11.5, VAT 1.73), credited 101.77, no platform fee', async () => {
      const [row] = await run(alloc('pharmacy_own'), false);
      expect(row).toMatchObject({ type: 'provider_earning', gross: 115, commission: 11.5, vat: 1.73, amount: 101.77, platform_delivery_fee: 0, delivery_mode: 'pharmacy_own' });
    });
    it('cash on delivery: the pharmacy owes only commission + VAT on the whole 115; it keeps its fee', async () => {
      const [row] = await run(alloc('pharmacy_own'), true);
      expect(row).toMatchObject({ type: 'provider_debit', gross: 115, commission: 11.5, vat: 1.73, platform_delivery_fee: 0, amount: 13.23 });
    });
    it('the mode on the order is used when the allocation carries none', async () => {
      const [row] = await run(alloc(), false, 'pharmacy_own');
      expect(row).toMatchObject({ gross: 115, platform_delivery_fee: 0, delivery_mode: 'pharmacy_own' });
    });
  });
});
