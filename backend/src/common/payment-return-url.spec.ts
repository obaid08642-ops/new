import { paymentReturnBase } from './payment-return-url';

describe('paymentReturnBase', () => {
  it('PAYMENT_RESULT_URL wins; else PUBLIC_APP_URL + /payments/result', () => {
    expect(paymentReturnBase({ NODE_ENV: 'production', PAYMENT_RESULT_URL: 'https://nabd.plus/payments/result', PUBLIC_APP_URL: 'https://other' } as any)).toEqual({ base: 'https://nabd.plus/payments/result' });
    expect(paymentReturnBase({ NODE_ENV: 'production', PUBLIC_APP_URL: 'https://nabd.plus/' } as any)).toEqual({ base: 'https://nabd.plus/payments/result' });
  });
  it('production with neither, or with a non-https or relative address: refused before Moyasar is called', () => {
    expect(paymentReturnBase({ NODE_ENV: 'production' } as any)).toEqual({ error: 'payment_return_url_not_configured' });
    expect(paymentReturnBase({ NODE_ENV: 'production', PAYMENT_RESULT_URL: 'http://nabd.plus/payments/result' } as any)).toEqual({ error: 'payment_return_url_not_configured' });
    expect(paymentReturnBase({ NODE_ENV: 'production', PAYMENT_RESULT_URL: '/payments/result' } as any)).toEqual({ error: 'payment_return_url_not_configured' });
  });
  it('outside production nothing changes (the live stack and the tests use a fake gateway)', () => {
    expect(paymentReturnBase({ NODE_ENV: 'development' } as any)).toEqual({ base: '/payments/result' });
    expect(paymentReturnBase({} as any)).toEqual({ base: '/payments/result' });
  });
});
