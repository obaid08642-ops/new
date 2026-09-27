/**
 * Moyasar API base URL. MOYASAR_API_BASE points the gateway client at a sandbox or at the local fake used by the
 * live journeys (tools/live/fake_moyasar.py); production must stay on HTTPS.
 */
export function moyasarBase(): string {
  const base = (process.env.MOYASAR_API_BASE || 'https://api.moyasar.com/v1').replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && !base.startsWith('https://')) throw new Error('MOYASAR_API_BASE must be https in production');
  return base;
}
