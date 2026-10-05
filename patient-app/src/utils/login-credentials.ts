/**
 * Body for POST /auth/login from the login field, which accepts an email or a phone.
 * Only a phone number gets the +966 prefix; an email goes as `identifier`.
 */
export function loginCredentials(entered: string, password: string) {
  const value = entered.trim();
  if (value.includes('@')) return { identifier: value.toLowerCase(), password };
  return { phone: value.startsWith('+') ? value : `+966${value.replace(/^0+/, '')}`, password };
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^\+?[\d\s()-]+$/;

/**
 * The login field takes an email or a phone, and each is checked by its own rule: an email by its shape (so a valid
 * short address such as a@b.sa passes), a phone by its digits (9 to 15, with only digits, spaces, dashes,
 * brackets and a leading plus around them). Anything else is refused before a request is made.
 */
/** An email by its shape (one @, something on each side, a dot in the domain). */
export function isValidEmail(entered: string): boolean {
  return EMAIL_SHAPE.test(entered.trim());
}

export function isValidIdentifier(entered: string): boolean {
  const value = entered.trim();
  if (!value) return false;
  if (value.includes('@')) return isValidEmail(value);
  if (!PHONE_CHARS.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 9 && digits <= 15;
}
