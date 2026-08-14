import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const identifier = process.env.NABDAH_E2E_IDENTIFIER;
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
if (!identifier || !password) throw new Error('MISSING_EPHEMERAL_SANDBOX_CREDENTIAL_CONFIGURATION');

const loginResponse = await fetch(`${baseUrl}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ identifier, password }),
});
const login = await loginResponse.json().catch(() => ({}));
const token = login?.token?.accessToken || login?.token || login?.access_token;
if (!loginResponse.ok || typeof token !== 'string') throw new Error(`SANDBOX_LOGIN_FAILED_${loginResponse.status}`);

const paymentResponse = await fetch(`${baseUrl}/moyasar/payments`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    accept: 'application/json',
    'idempotency-key': `e2e-zero-value-${Date.now()}`,
  },
  body: JSON.stringify({
    booking_id: `e2e-zero-payment-probe-${Date.now()}`,
    booking_kind: 'e2e_probe',
    amount: 0,
    description: 'E2E sandbox payment probe',
  }),
});
const payment = await paymentResponse.json().catch(() => ({}));
const gatewayId = typeof payment?.moyasar_id === 'string' ? payment.moyasar_id : typeof payment?.id === 'string' ? payment.id : '';
const artifact = {
  generatedAt: new Date().toISOString(),
  mode: 'single zero-value payment creation request; no card, callback, refund, or withdrawal',
  loginStatus: loginResponse.status,
  paymentCreationStatus: paymentResponse.status,
  submittedAmountSar: 0,
  sandboxIndicator: gatewayId.startsWith('sandbox_'),
  returnedStatus: typeof payment?.status === 'string' ? payment.status : null,
  responseHasPaymentIdentifier: Boolean(gatewayId),
  followUpActionsExecuted: 0,
};
fs.mkdirSync('/home/ubuntu/nabdah-audit-work/e2e-results', { recursive: true });
fs.writeFileSync(path.join('/home/ubuntu/nabdah-audit-work/e2e-results', 'zero-value-payment-probe.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
