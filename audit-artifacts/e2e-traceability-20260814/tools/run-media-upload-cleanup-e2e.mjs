import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
const identifier = process.env.NABDAH_E2E_IDENTIFIER;
const outputDir = '/home/ubuntu/nabdah-audit-work/e2e-results';
fs.mkdirSync(outputDir, { recursive: true });

if (!password || !identifier) throw new Error('MISSING_EPHEMERAL_SANDBOX_CREDENTIAL_CONFIGURATION');
const response = await fetch(`${baseUrl}/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ identifier, password }),
});
const login = await response.json().catch(() => ({}));
const token = login?.token?.accessToken || login?.token || login?.access_token;
if (!response.ok || typeof token !== 'string') throw new Error(`SANDBOX_LOGIN_FAILED_${response.status}`);

const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL0YQAAAABJRU5ErkJggg==', 'base64');
const form = new FormData();
form.append('folder', 'e2e-audit-temporary');
form.append('file', new Blob([onePixelPng], { type: 'image/png' }), `probe-${Date.now()}.png`);

const upload = await fetch(`${baseUrl}/media/upload`, { method: 'POST', headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, body: form });
const uploaded = await upload.json().catch(() => ({}));
const key = uploaded?.key;
let deletionStatus = null;
let publicAfterDeleteStatus = null;
if (upload.ok && typeof key === 'string') {
  const deletion = await fetch(`${baseUrl}/media/${key.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });
  deletionStatus = deletion.status;
  if (deletion.ok && typeof uploaded?.url === 'string') {
    const publicProbe = await fetch(uploaded.url, { headers: { accept: 'image/png' } });
    publicAfterDeleteStatus = publicProbe.status;
  }
}
const artifact = {
  generatedAt: new Date().toISOString(),
  mode: 'authenticated upload of non-sensitive 1×1 PNG, immediate delete, public absence probe',
  loginStatus: response.status,
  uploadStatus: upload.status,
  keyReceived: Boolean(key),
  deletionStatus,
  publicAfterDeleteStatus,
  cleanupVerified: deletionStatus >= 200 && deletionStatus < 300 && publicAfterDeleteStatus === 404,
};
fs.writeFileSync(path.join(outputDir, 'media-upload-cleanup-e2e.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
if (!artifact.cleanupVerified) process.exitCode = 2;
