import { BusinessRulesService } from './business-rules.module';

/** VAT model A (owner, 2026-11-01): the rules' price carries no platform VAT (it used to add 15% on top of the service price). */
describe('BusinessRulesService pricing', () => {
  function pricing(ctx: any, meta: any = {}) {
    const svc: any = Object.create(BusinessRulesService.prototype);
    svc.surgeConfig = { startHour: 18, endHour: 22, multiplier: 1.25 };
    const r: any = { ok: true, errors: [], warnings: [], meta };
    svc.computePricing(ctx, r);
    return r;
  }
  it('final price = the service price: no VAT added on top', () => {
    expect(pricing({ service: { price: 200 } })).toMatchObject({ base_price: 200, tax: 0, insurance_discount: 0, final_price: 200 });
  });
  it('the surge multiplier still applies to the price', () => {
    expect(pricing({ service: { price: 200 }, scheduled_at: new Date(2026, 10, 2, 19, 0, 0) })).toMatchObject({ tax: 0, surge_multiplier: 1.25, final_price: 250 });
  });
  it('the insured discount is taken off the price, without tax', () => {
    expect(pricing({ service: { price: 200 }, insurance: { provider: 'bupa' } }, { insurance_validated: true })).toMatchObject({ insurance_discount: 160, tax: 0, final_price: 40 });
  });
});
