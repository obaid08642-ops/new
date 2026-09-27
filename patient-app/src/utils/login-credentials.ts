/**
 * Body for POST /auth/login from the login field, which accepts an email or a phone.
 * Only a phone number gets the +966 prefix; an email goes as `identifier`.
 */
export function loginCredentials(entered: string, password: string) {
  const value = entered.trim();
  if (value.includes('@')) return { identifier: value.toLowerCase(), password };
  return { phone: value.startsWith('+') ? value : `+966${value.replace(/^0+/, '')}`, password };
}
