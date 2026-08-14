import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const identifier = process.env.NABDAH_E2E_ADMIN_IDENTIFIER;
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
if (!identifier || !password) throw new Error('MISSING_EPHEMERAL_ADMIN_AUTH_CONFIGURATION');
const response = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ identifier, password }) });
const body = await response.json().catch(() => ({}));
const artifact = {
  generatedAt: new Date().toISOString(),
  mode: 'start admin OTP cycle only; no OTP verification and no administrative reads',
  loginStatus: response.status,
  twoFactorRequired: Boolean(body?.requires_2fa || body?.requires2fa || body?.two_factor_required),
  tokenIssuedBefore2fa: Boolean(body?.token || body?.access_token),
};
fs.mkdirSync('/home/ubuntu/nabdah-audit-work/e2e-results', { recursive: true });
fs.writeFileSync(path.join('/home/ubuntu/nabdah-audit-work/e2e-results', 'admin-otp-initiation.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
