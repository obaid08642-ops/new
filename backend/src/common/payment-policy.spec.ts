import { assertPaymentMethod, paymentMethodAllowed } from './payment-policy';

// PT-21: cash, card and insurance by kind of visit - one table.
describe('payment method by kind of visit', () => {
  const matrix: Array<[string, 'online_consultation' | 'home_visit' | 'in_clinic', boolean]> = [
    ['cash', 'online_consultation', false], ['card', 'online_consultation', true], ['insurance', 'online_consultation', false],
    ['cash', 'home_visit', false], ['card', 'home_visit', true], ['insurance', 'home_visit', true],
    ['cash', 'in_clinic', true], ['card', 'in_clinic', true], ['insurance', 'in_clinic', true],
  ];
  it.each(matrix)('%s for %s -> %s', (method, ctx, ok) => {
    expect(paymentMethodAllowed(method, ctx)).toBe(ok);
    if (ok) expect(() => assertPaymentMethod(method, ctx)).not.toThrow();
    else expect(() => assertPaymentMethod(method, ctx)).toThrow(`payment_method_${method}_not_allowed_for_${ctx}`);
  });
  it('an unknown method is refused everywhere', () => {
    expect(paymentMethodAllowed('crypto', 'in_clinic')).toBe(false);
  });
});
