import { MoyasarAdapter, PaymentsService } from './payments.module';

// R11 P2: what is sent to the gateway and what is expected back are whole halalas computed exactly (toHalalas), not round(x * 100):
// 8.325 * 100 is 832.4999999999999 in binary floating point, so the old code sent 832 for an amount of 8.325 SAR.
describe('gateway amounts in exact halalas (R11 P2)', () => {
  const env = { ...process.env };
  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    process.env.MOYASAR_API_KEY = 'sk_test_x';
    process.env.PAYMENT_RESULT_URL = 'https://result.test/payments/result';
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'inv_1', url: 'https://pay.test/x', source: {} }), text: async () => '{}' } as any);
  });
  afterEach(() => { fetchSpy.mockRestore(); process.env = { ...env }; });
  const sentBody = () => JSON.parse((fetchSpy.mock.calls[0][1] as any).body);

  it('the checkout amount is the exact halalas of the SAR amount', async () => {
    await new MoyasarAdapter().createIntent({ amount: 150, currency: 'SAR', description: 'x', metadata: {}, return_ref: 't1' });
    expect(sentBody().amount).toBe(15000);
    fetchSpy.mockClear();
    await new MoyasarAdapter().createIntent({ amount: 8.325, currency: 'SAR', description: 'x', metadata: {}, return_ref: 't2' });
    expect(sentBody().amount).toBe(833);                  // round(8.325 * 100) would send 832
  });

  it('a refund sends the exact halalas of the SAR amount', async () => {
    await new MoyasarAdapter().refund('pay_1', 12.34);
    expect(sentBody().amount).toBe(1234);
  });

  describe('the amount the gateway must report back before a payment settles', () => {
    const svc: any = Object.create(PaymentsService.prototype);
    svc.adapter = { name: 'moyasar' };
    const match = (t: any, raw: any): boolean => svc.gatewayAmountMatches(t, raw);

    it('uses the integer shadow when the transaction has one', () => {
      expect(match({ amount: 100, amount_halalas: 9999, currency: 'SAR' }, { amount: 9999, currency: 'SAR' })).toBe(true);
      expect(match({ amount: 100, amount_halalas: 9999, currency: 'SAR' }, { amount: 10000, currency: 'SAR' })).toBe(false);
    });
    it('falls back to the double converted exactly where there is no shadow', () => {
      expect(match({ amount: 8.325, currency: 'SAR' }, { amount: 833, currency: 'SAR' })).toBe(true);
      expect(match({ amount: 150, currency: 'SAR' }, { amount: 15000, currency: 'SAR' })).toBe(true);
      expect(match({ amount: 150, currency: 'SAR' }, { amount: 14999, currency: 'SAR' })).toBe(false);   // a paid-for-less is never a payment
    });
    it('a zero, missing or non-numeric amount or a wrong currency never matches', () => {
      expect(match({ amount: 0, currency: 'SAR' }, { amount: 0, currency: 'SAR' })).toBe(false);
      expect(match({ amount: 'x', currency: 'SAR' }, { amount: 100, currency: 'SAR' })).toBe(false);
      expect(match({ amount: 10, currency: 'SAR' }, { amount: 1000, currency: 'USD' })).toBe(false);
    });
  });
});
