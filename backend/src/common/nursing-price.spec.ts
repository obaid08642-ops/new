import { assertNursingDelta, assertNursingServicePrices } from './nursing-price';

const code = (fn: () => void): unknown => { try { fn(); return null; } catch (e) { return (e as { getResponse: () => { code: string } }).getResponse().code; } };

describe('nursing service prices (registration and settings)', () => {
  it('accepts every service with a price above 0', () => {
    expect(code(() => assertNursingServicePrices([{ key: 'injection', price: 40 }, { key: 'dressing', price: 0.5 }]))).toBeNull();
  });
  it('refuses price 0, a missing price, text and a negative price, naming the services', () => {
    for (const price of [0, undefined, '95', -1, NaN]) expect(code(() => assertNursingServicePrices([{ key: 'injection', price }]))).toBe('nursing_service_price_required');
    try { assertNursingServicePrices([{ key: 'a', price: 5 }, { key: 'b', price: 0 }]); } catch (e) { expect((e as { getResponse: () => { services: string[] } }).getResponse().services).toEqual(['b']); }
  });
  it('refuses a list that is not a list of { key, price }', () => {
    expect(code(() => assertNursingServicePrices('injection'))).toBe('nursing_services_invalid');
    expect(code(() => assertNursingServicePrices([{ price: 5 }]))).toBe('nursing_service_price_required');
  });
});

describe('nursing settings/delta shape', () => {
  it('accepts a change that maps to nursing_services[] and the known settings', () => {
    expect(code(() => assertNursingDelta({ nursing_services: [{ key: 'injection', price: 40 }], accepts_insurance: true, priceVisit: 80 }))).toBeNull();
  });
  it('refuses an empty or non-object body and unknown fields (they would change nothing the patient reads)', () => {
    expect(code(() => assertNursingDelta({}))).toBe('delta_empty');
    expect(code(() => assertNursingDelta(null))).toBe('delta_shape_invalid');
    expect(code(() => assertNursingDelta([1]))).toBe('delta_shape_invalid');
    expect(code(() => assertNursingDelta({ services: ['injection'], pricing: { visit: 50 } }))).toBe('delta_unknown_fields');
  });
  it('refuses price 0 inside the delta, in the list and in the visit/hour/day/month prices', () => {
    expect(code(() => assertNursingDelta({ nursing_services: [{ key: 'injection', price: 0 }] }))).toBe('nursing_service_price_required');
    expect(code(() => assertNursingDelta({ priceHour: 0 }))).toBe('nursing_price_invalid');
  });
});
