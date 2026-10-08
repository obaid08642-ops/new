import { R5_ERROR_CODES, platformError } from './errors';
import { buildPlatformError, lookupError } from './error-catalog';

describe('13.R5 error catalog', () => {
  it('resolves every R5 code to ar + en messages with a next step', () => {
    expect(R5_ERROR_CODES).toHaveLength(14);
    for (const code of R5_ERROR_CODES) {
      const en = lookupError(code, 'en');
      const ar = lookupError(code, 'ar');
      expect(en.code).toBe(code);
      expect(ar.code).toBe(code);
      expect(en.message.length).toBeGreaterThan(0);
      expect(ar.message.length).toBeGreaterThan(0);
      expect(ar.message).not.toBe(en.message);
      expect(en.nextStep.length).toBeGreaterThan(0);
      expect(ar.nextStep.length).toBeGreaterThan(0);
    }
  });

  it('resolves every R5 code in all 6 platform locales (D28)', () => {
    for (const code of R5_ERROR_CODES) {
      const seen = new Set<string>();
      for (const locale of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
        const r = lookupError(code, locale);
        expect(r.code).toBe(code);
        expect(r.message.length).toBeGreaterThan(0);
        expect(r.nextStep.length).toBeGreaterThan(0);
        seen.add(r.message);
      }
      // every locale carries its own message (no silent English everywhere)
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it("aliases the backend 'tl' spelling to the catalog 'fil' (Q90)", () => {
    expect(lookupError('NOT_FOUND', 'tl')).toEqual(lookupError('NOT_FOUND', 'fil'));
  });

  it('falls back for unknown codes and unknown locales without throwing', () => {
    const unknown = lookupError('NO_SUCH_CODE', 'en');
    expect(unknown.code).toBe('UNKNOWN_ERROR');
    expect(unknown.message.length).toBeGreaterThan(0);

    const unknownAr = lookupError('NO_SUCH_CODE', 'ar');
    expect(unknownAr.code).toBe('UNKNOWN_ERROR');

    const badLocale = lookupError('INVALID_INPUT', 'fr');
    expect(badLocale.code).toBe('INVALID_INPUT');
    expect(badLocale.message).toBe(lookupError('INVALID_INPUT', 'en').message);
  });

  it('platformError() produces {code,message,details,nextStep}', () => {
    const err = platformError('PAYMENT_REQUIRED', 'Pay now', { orderId: '1' }, 'Complete the payment');
    expect(err.code).toBe('PAYMENT_REQUIRED');
    expect(err.message).toBe('Pay now');
    expect(err.details).toEqual({ orderId: '1' });
    expect(err.nextStep).toBe('Complete the payment');

    const built = buildPlatformError('NOPE_UNKNOWN', { locale: 'ar' });
    expect(built.code).toBe('UNKNOWN_ERROR');
    expect(built.message.length).toBeGreaterThan(0);
  });
});
