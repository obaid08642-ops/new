import { isValidEmail, isValidIdentifier, loginCredentials } from './login-credentials';

describe('loginCredentials', () => {
  it('sends an email as identifier, never +966-prefixed', () => {
    expect(loginCredentials(' User@Mail.com ', 'pw')).toEqual({ identifier: 'user@mail.com', password: 'pw' });
  });
  it('normalizes a local phone to +966', () => {
    expect(loginCredentials('0551234567', 'pw')).toEqual({ phone: '+966551234567', password: 'pw' });
  });
  it('keeps an international phone', () => {
    expect(loginCredentials('+201001234567', 'pw')).toEqual({ phone: '+201001234567', password: 'pw' });
  });
});

describe('isValidIdentifier: an email by its shape, a phone by its digits', () => {
  it('accepts a valid short email (a@b.sa has 6 characters)', () => {
    expect(isValidIdentifier('a@b.sa')).toBe(true);
    expect(isValidIdentifier(' User@Mail.com ')).toBe(true);
  });
  it('refuses a malformed email whatever its length', () => {
    for (const bad of ['a@b', '@mail.com', 'user@', 'user @mail.com', 'user@@mail.com', 'userpassword@nowhere']) expect(isValidIdentifier(bad)).toBe(false);
  });
  it('accepts a phone by its digits: local, 05 and international forms', () => {
    for (const ok of ['551234567', '0551234567', '+966551234567', '+966 55 123 4567', '(055) 123-4567']) expect(isValidIdentifier(ok)).toBe(true);
  });
  it('refuses a phone with too few or too many digits, or with letters', () => {
    for (const bad of ['', '   ', '12345678', '1234567890123456', '05512ab4567', 'name']) expect(isValidIdentifier(bad)).toBe(false);
  });
  it('isValidEmail is the shape check on its own', () => {
    expect(isValidEmail('a@b.sa')).toBe(true);
    expect(isValidEmail('0551234567')).toBe(false);
  });
});
