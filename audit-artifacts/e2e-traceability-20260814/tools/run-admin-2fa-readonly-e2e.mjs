import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const identifier = process.env.NABDAH_E2E_ADMIN_IDENTIFIER;
const stdinSecrets = (!process.env.NABDAH_E2E_SANDBOX_PASSWORD || !process.env.NABDAH_E2E_ADMIN_OTP)
  ? fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean)
  : [];
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD || stdinSecrets[0];
const otp = process.env.NABDAH_E2E_ADMIN_OTP || stdinSecrets[1];
if (!identifier || !password || !otp) throw new Error('MISSING_EPHEMERAL_ADMIN_2FA_CONFIGURATION');

const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ identifier, password }) });
const login = await loginResponse.json().catch(() => ({}));
const verifyResponse = await fetch(`${baseUrl}/auth/verify-otp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ identifier, code: otp }) });
const verified = await verifyResponse.json().catch(() => ({}));
const token = verified?.token?.accessToken || verified?.token || verified?.access_token;
const readChecks = [];
if (typeof token === 'string') {
  for (const route of ['/auth/me', '/admin/feature-flags']) {
    const response = await fetch(`${baseUrl}${route}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });
    readChecks.push({ route, status: response.status, ok: response.ok, bodyLength: (await response.text()).length });
  }
}
const artifact = {
  generatedAt: new Date().toISOString(),
  mode: 'POST login + POST OTP verification, then GET auth identity and feature flags only',
  loginStatus: loginResponse.status,
  twoFactorRequired: Boolean(login?.requires_2fa || login?.requires2fa || login?.two_factor_required),
  verifyOtpStatus: verifyResponse.status,
  tokenObtained: typeof token === 'string',
  readChecks,
};
fs.mkdirSync('/home/ubuntu/nabdah-audit-work/e2e-results', { recursive: true });
fs.writeFileSync(path.join('/home/ubuntu/nabdah-audit-work/e2e-results', 'admin-2fa-readonly-e2e.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
