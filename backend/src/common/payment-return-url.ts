/**
 * Where the gateway sends the patient back after the hosted checkout (3-D Secure included): `PAYMENT_RESULT_URL`, else
 * `PUBLIC_APP_URL` + `/payments/result`. With neither set, the address handed to Moyasar was the bare path `/payments/result`,
 * which Moyasar rejects (or, worse, a redirect nowhere): every card payment would fail at go-live with a generic gateway error.
 * In production the address must be absolute `https`; outside production the old behaviour stays (the live stack's fake gateway
 * takes any address).
 */
export function paymentReturnBase(env: NodeJS.ProcessEnv = process.env): { base: string } | { error: 'payment_return_url_not_configured' } {
  const explicit = String(env.PAYMENT_RESULT_URL || '').trim();
  const site = String(env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const base = explicit || `${site}/payments/result`;
  if (String(env.NODE_ENV) === 'production' && !/^https:\/\/[^/\s]+/i.test(base)) return { error: 'payment_return_url_not_configured' };
  return { base };
}
