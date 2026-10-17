import { payoutErrorText } from '../payoutErrors';

describe('payoutErrorText', () => {
  const fb = 'fallback';
  it('never prints a backend code to the provider', () => {
    for (const code of ['verified_bank_account_required', 'invalid_verified_iban', 'negative_balance', 'insufficient_available_balance', 'pending_withdrawal_exists', 'valid_amount_required', 'idempotency_key_required', 'minimum_withdrawal_100']) {
      for (const ar of [true, false]) {
        const text = payoutErrorText(code, ar, fb);
        expect(text).not.toBe(code);
        expect(text).not.toMatch(/_/);
        expect(text).not.toBe(fb);
      }
    }
  });
  it('puts the server minimum in the sentence', () => {
    expect(payoutErrorText('minimum_withdrawal_100', false, fb)).toBe('The minimum withdrawal is 100 SAR');
    expect(payoutErrorText('minimum_withdrawal_100', true, fb)).toContain('100');
  });
  it('uses the fallback for an unknown or missing message', () => {
    expect(payoutErrorText('something_else', true, fb)).toBe(fb);
    expect(payoutErrorText(undefined, false, fb)).toBe(fb);
  });
});
