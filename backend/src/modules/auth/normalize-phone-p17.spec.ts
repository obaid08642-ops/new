import { AuthService } from './auth.service';
import { normalizeDigits } from './checkout-contact.service';

/**
 * Phase 17, task 17.9 (phone-friendly forms): the login OTP and the password-reset
 * token are the two places a patient types a number on a phone keypad. Both go through
 * `AuthService.normalizePhone`, and a Saudi patient writing Arabic-Indic digits (٠-٩) or
 * Eastern Arabic-Indic digits (۰-۹) — the default keyboard in an Arabic locale — must
 * reach the same account as the Latin form.
 *
 * The checkout path already normalises both digit sets (`normalizeDigits` in
 * `checkout-contact.service.ts`, covered by `checkout-contact.service.spec.ts:38-39`).
 * These cases lock the auth path to the same rule instead of leaving a second, weaker
 * implementation. `0501234567` -> `+966501234567` is the same pair used by the checkout
 * spec, so the two paths are directly comparable.
 */
describe('17.9 AuthService.normalizePhone accepts Arabic-Indic digits', () => {
  it.each([
    ['٠٥٠١٢٣٤٥٦٧', '+966501234567', 'Arabic-Indic (٠-٩)'],
    ['۰۵۰۱۲۳۴۵۶۷', '+966501234567', 'Eastern Arabic-Indic (۰-۹)'],
    ['+٩٦٦٥٠١٢٣٤٥٦٧', '+966501234567', 'Arabic-Indic with a + prefix'],
    ['٠٠٩٦٦٥٠١٢٣٤٥٦٧', '+966501234567', 'Arabic-Indic 00 prefix'],
    ['٩٦٦٥٠١٢٣٤٥٦٧', '+966501234567', 'Arabic-Indic bare country code'],
    ['٠٥٠ ١٢٣ ٤٥٦٧', '+966501234567', 'Arabic-Indic with spaces'],
  ])('%s -> %s  (%s)', (input, expected) => {
    expect(AuthService.normalizePhone(input as string)).toBe(expected);
  });

  it('agrees with the checkout path, which already handled both digit sets', () => {
    expect(normalizeDigits('٠٥٠١٢٣٤٥٦٧')).toBe('0501234567');
    expect(AuthService.normalizePhone('٠٥٠١٢٣٤٥٦٧')).toBe(
      AuthService.normalizePhone(normalizeDigits('٠٥٠١٢٣٤٥٦٧')),
    );
  });

  it('still leaves the Latin forms and non-SA numbers alone', () => {
    expect(AuthService.normalizePhone('0501234567')).toBe('+966501234567');
    expect(AuthService.normalizePhone('+966501234567')).toBe('+966501234567');
    expect(AuthService.normalizePhone('00966501234567')).toBe('+966501234567');
    expect(AuthService.normalizePhone('966501234567')).toBe('+966501234567');
    expect(AuthService.normalizePhone('0512345678')).toBe('+966512345678');
    expect(AuthService.normalizePhone('+14155550123')).toBe('+14155550123');
    expect(AuthService.normalizePhone('not-a-number')).toBe('not-a-number');
  });

  it('does not mangle Arabic letters or non-numeric text', () => {
    expect(AuthService.normalizePhone('مرحبا')).toBe('مرحبا');
    expect(AuthService.normalizePhone('sara@example.com')).toBe('sara@example.com');
  });
});