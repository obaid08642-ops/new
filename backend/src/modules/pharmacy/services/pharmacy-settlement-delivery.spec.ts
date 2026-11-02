import { PharmacyAllocationService, pharmacySettlementGross } from './pharmacy-allocation.service';

/**
 * The delivery fee of a pharmacy order is charged by the platform (it comes only from the platform pricing config): it is not the
 * pharmacy's gross. No commission is taken on it, it is not credited to the pharmacy, and with cash on delivery the pharmacy owes it.
 */
const alloc = (over: any = {}) => ({ id: 'al1', order_id: 'o1', pharmacy_account_id: 'ph1', totals: { subtotal: 100, delivery_fee: 15, total: 115 }, fulfillment: { delivery_fee_source: 'platform_pricing_config' }, ...over });

describe('pharmacySettlementGross', () => {
  it('the platform keeps the delivery fee: the pharmacy\'s gross is the items', () => {
    expect(pharmacySettlementGross(alloc())).toEqual({ gross: 100, platformDeliveryFee: 15 });
  });
  it('no delivery fee: unchanged', () => {
    expect(pharmacySettlementGross(alloc({ totals: { subtotal: 100, delivery_fee: 0, total: 100 } }))).toEqual({ gross: 100, platformDeliveryFee: 0 });
  });
  it('a fee the pharmacy sets itself stays in its gross', () => {
    expect(pharmacySettlementGross(alloc({ fulfillment: { delivery_fee_source: 'pharmacy' } }))).toEqual({ gross: 115, platformDeliveryFee: 0 });
  });
});

describe('settleDeliveredAllocation', () => {
  function run(a: any, isCod: boolean) {
    const rows: any[] = [];
    const svc: any = Object.create(PharmacyAllocationService.prototype);
    const cols: Record<string, any> = {
      platformledgerentries: { findOne: async () => null, insertOne: async (r: any) => { rows.push(r); } },
      finance_config: { findOne: async () => ({ service_types: { pharmacy: { percent: 10 } }, tax: { vat_percent: 15 } }) },
    };
    svc.orders = { db: { collection: (n: string) => cols[n] } };
    return svc.settleDeliveredAllocation(a, isCod).then(() => rows);
  }
  it('paid online: commission and VAT on the items only, the pharmacy is credited 100 - 10 - 1.5 and not the delivery fee', async () => {
    const [row] = await run(alloc(), false);
    expect(row).toMatchObject({ type: 'provider_earning', gross: 100, commission: 10, vat: 1.5, amount: 88.5, platform_delivery_fee: 15 });
  });
  it('cash on delivery: the pharmacy owes commission + VAT + the delivery fee it collected for the platform', async () => {
    const [row] = await run(alloc(), true);
    expect(row).toMatchObject({ type: 'provider_debit', gross: 100, commission: 10, vat: 1.5, platform_delivery_fee: 15, amount: 26.5 });
  });
  it('a pharmacy\'s own delivery fee is its gross like the items', async () => {
    const [row] = await run(alloc({ fulfillment: { delivery_fee_source: 'pharmacy' } }), false);
    expect(row).toMatchObject({ gross: 115, commission: 11.5, platform_delivery_fee: 0 });
  });
});
