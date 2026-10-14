import * as crypto from 'crypto';

/**
 * D-28/S-5: how a Moyasar webhook proves it is Moyasar.
 *
 * Moyasar documents no signature header. Its webhook body carries
 * `secret_token` — the secret configured on the webhook in the Moyasar
 * dashboard. A request is authentic when that token equals
 * `MOYASAR_WEBHOOK_SECRET`, compared in constant time.
 *
 * Some of our receivers also accept an HMAC-SHA256 of the raw body in a
 * signature header (older integration path). Either proof is accepted; a
 * request with neither is refused. With no secret configured, everything is
 * refused — a webhook that cannot be authenticated is never trusted.
 */
export function isMoyasarWebhookAuthenticated(
  payload: unknown,
  signature: string | undefined,
  rawBody: string,
): boolean {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET || '';
  if (!secret) return false;

  if (signature) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signature, 'hex');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch {
      // fall through to the body-token check
    }
  }

  const token = (payload as any)?.secret_token ?? (payload as any)?.data?.secret_token;
  if (typeof token !== 'string' || !token) return false;
  try {
    const a = Buffer.from(token, 'utf8');
    const b = Buffer.from(secret, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
