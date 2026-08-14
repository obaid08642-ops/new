import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1';
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
const targets = JSON.parse(process.env.NABDAH_E2E_IDENTIFIERS_JSON || '{}');
const outputDir = '/home/ubuntu/nabdah-audit-work/e2e-results';
const runId = (process.env.NABDAH_E2E_RUN_ID || new Date().toISOString()).replace(/[^A-Za-z0-9._-]/g, '-');
fs.mkdirSync(outputDir, { recursive: true });

if (!password || Object.keys(targets).length === 0) {
  throw new Error('MISSING_EPHEMERAL_SANDBOX_CREDENTIAL_CONFIGURATION');
}

function endpoint(value) { return `${baseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`; }
function redactErrorBody(text = '') {
  return String(text).slice(0, 220).replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]');
}
function tokenMetadata(token) {
  if (typeof token !== 'string') return undefined;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return {
      claimKeys: Object.keys(payload).filter((key) => !['sub', 'id', 'email', 'phone', 'name'].includes(key)).sort(),
      role: typeof payload.role === 'string' ? payload.role : undefined,
      subjectPresent: Boolean(payload.sub || payload.id),
      expiryPresent: Boolean(payload.exp),
    };
  } catch {
    return { claimKeys: [], unreadable: true };
  }
}
async function postJson(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const raw = await response.text();
  let body = {};
  try { body = JSON.parse(raw); } catch { body = {}; }
  return { response, body, raw };
}
async function readOnly(url, token) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  const raw = await response.text();
  return { status: response.status, ok: response.ok, bodyLength: raw.length, errorPreview: response.ok ? undefined : redactErrorBody(raw) };
}

const results = [];
for (const [role, config] of Object.entries(targets)) {
  const loginPath = config.loginPath || '/auth/login';
  const identifier = config.identifier;
  const loginBody = config.identifierField === 'email'
    ? { email: identifier, password }
    : { identifier, password };
  const login = await postJson(endpoint(loginPath), loginBody);
  const token = login.body?.token?.accessToken || login.body?.token || login.body?.access_token || login.body?.data?.token?.accessToken || login.body?.data?.token;
  const requires2fa = Boolean(login.body?.requires_2fa || login.body?.requires2FA || login.body?.two_factor_required);
  const record = {
    role,
    loginPath,
    loginHttpStatus: login.response.status,
    tokenObtained: Boolean(token),
    tokenMetadata: tokenMetadata(token),
    requires2fa,
    loginErrorPreview: login.response.ok ? undefined : redactErrorBody(login.raw),
    readChecks: [],
  };
  if (token) {
    for (const route of ['/auth/me', ...(config.readRoutes || [])]) {
      record.readChecks.push({ route, ...(await readOnly(endpoint(route), token)) });
    }
  }
  results.push(record);
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: 'POST login only + GET verification only',
  rolesAttempted: results.length,
  tokensObtained: results.filter((item) => item.tokenObtained).length,
  twoFactorGates: results.filter((item) => item.requires2fa).length,
  readChecks: results.reduce((sum, item) => sum + item.readChecks.length, 0),
  successfulReadChecks: results.flatMap((item) => item.readChecks).filter((item) => item.ok).length,
};
const artifact = { summary, results };
fs.writeFileSync(path.join(outputDir, `readonly-e2e-${runId}.json`), JSON.stringify(artifact, null, 2));
fs.writeFileSync(path.join(outputDir, 'readonly-e2e-latest.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(summary, null, 2));
