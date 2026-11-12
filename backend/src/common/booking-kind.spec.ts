import { BILLING_KIND_OF, billingKindOf, transactionKinds } from './booking-kind';

describe('one shared booking-kind map for payments and billing', () => {
  it.each([
    ['orders', 'order'], ['order', 'order'], ['pharmacy', 'pharmacy'],
    ['labs', 'lab'], ['lab', 'lab'],
    ['home-care', 'home_care'], ['homecare', 'home_care'], ['home_care', 'home_care'], ['nursing', 'nursing'],
    ['insurance-copay', 'insurance'], ['copay', 'insurance'], ['insurance', 'insurance'],
    ['appointment', 'appointment'], ['consultation', 'consultation'], ['radiology', 'radiology'],
    ['  LABS ', 'lab'],
  ])('%s is billed as %s', (alias, kind) => {
    expect(billingKindOf(alias)).toBe(kind);
  });

  it('an unknown kind comes back unchanged (billing still refuses it)', () => {
    expect(billingKindOf('subscription')).toBe('subscription');
    expect(billingKindOf(undefined)).toBe('');
  });

  it.each([
    ['labs', ['lab', 'labs']],
    ['orders', ['pharmacy', 'order', 'orders']],
    ['homecare', ['nursing', 'home_care', 'home-care', 'homecare']],
    ['consultation', ['consultation', 'appointment']],
    ['radiology', ['radiology']],
  ])('a payment of %s may be stored under any of its spellings', (alias, stored) => {
    expect([...transactionKinds(alias)].sort()).toEqual([...stored].sort());
  });

  it('every kind the payment API accepts is mapped', () => {
    const accepted = ['pharmacy', 'order', 'orders', 'consultation', 'appointment', 'lab', 'labs', 'radiology', 'nursing', 'home-care', 'homecare', 'insurance', 'insurance-copay', 'copay'];
    for (const k of accepted) expect(Object.keys(BILLING_KIND_OF)).toContain(k);
  });
});
