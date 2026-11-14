/**
 * The gateway return address (`callback_url`) is where the payer's browser is sent after paying, so it must be one of OUR origins: a value taken from the request body would otherwise
 * make the checkout redirect to any site (phishing off a real payment page). Allowed: https on nabd.plus, api.nabd.plus, admin.nabd.plus (and the host of PUBLIC_APP_URL, so staging
 * works), and the app's deep-link scheme nabdplus://. Anything else, including credentials in the URL, a port, http, or a look-alike host, is refused.
 */
const OWN_HOSTS = ['nabd.plus', 'api.nabd.plus', 'admin.nabd.plus'];
const DEEP_LINK_SCHEME = 'nabdplus:';

export function isAllowedCallbackUrl(raw: unknown, publicAppUrl: string | undefined = process.env.PUBLIC_APP_URL): boolean {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.username || u.password) return false;
  if (u.protocol === DEEP_LINK_SCHEME) return true;
  if (u.protocol !== 'https:' || u.port) return false;
  const hosts = new Set(OWN_HOSTS);
  try { if (publicAppUrl) { const p = new URL(publicAppUrl); if (p.protocol === 'https:') hosts.add(p.hostname.toLowerCase()); } } catch { /* an unusable PUBLIC_APP_URL adds nothing */ }
  return hosts.has(u.hostname.toLowerCase());
}
