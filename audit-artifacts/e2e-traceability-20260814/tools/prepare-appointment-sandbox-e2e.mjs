import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
const patientIdentifier = process.env.NABDAH_E2E_PATIENT_IDENTIFIER;
const providerIdentifier = process.env.NABDAH_E2E_PROVIDER_IDENTIFIER;
const providerAccountId = process.env.NABDAH_E2E_PROVIDER_ACCOUNT_ID;
if (!password || !patientIdentifier || !providerIdentifier) throw new Error('MISSING_EPHEMERAL_SANDBOX_CREDENTIAL_CONFIGURATION');

async function login(pathname, identifier, emailField = false) {
  const response = await fetch(`${baseUrl}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(emailField ? { email: identifier, password } : { identifier, password }) });
  const body = await response.json().catch(() => ({}));
  const token = body?.token?.accessToken || body?.token || body?.access_token;
  return { status: response.status, token: typeof token === 'string' ? token : undefined };
}
function subject(token) {
  try { const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); return payload.sub || payload.id; } catch { return undefined; }
}
const [patient, provider] = await Promise.all([
  login('/auth/login', patientIdentifier),
  login('/provider/auth/login', providerIdentifier, true),
]);
let candidate;
let doctorsStatus = null;
if (patient.token && provider.token) {
  const doctors = await fetch(`${baseUrl}/care/doctors`, { headers: { authorization: `Bearer ${patient.token}`, accept: 'application/json' } });
  doctorsStatus = doctors.status;
  const data = await doctors.json().catch(() => []);
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const providerSubject = subject(provider.token);
  const candidates = [
    { value: providerSubject, source: 'token-subject' },
    { value: providerAccountId, source: 'provided-account-id' },
  ].filter((item) => typeof item.value === 'string' && item.value.length > 0);
  let matchField = null;
  let matchSource = null;
  const match = list.find((item) => {
    for (const candidate of candidates) {
      for (const [field, value] of Object.entries(item || {})) {
        if (typeof value === 'string' && value === candidate.value) {
          matchField = field;
          matchSource = candidate.source;
          return true;
        }
      }
    }
    return false;
  });
  if (match) {
    candidate = {
      found: true,
      matchField,
      matchSource,
      serviceModes: Array.isArray(match.consultation_modes) ? match.consultation_modes : [],
      clinicPrice: typeof match.price_clinic === 'number' ? match.price_clinic : null,
      videoPrice: typeof match.price_online === 'number' ? match.price_online : null,
      homePrice: typeof match.price_home === 'number' ? match.price_home : null,
    };
  } else candidate = { found: false };
}
const artifact = { generatedAt: new Date().toISOString(), patientLoginStatus: patient.status, providerLoginStatus: provider.status, doctorsStatus, candidate };
fs.mkdirSync('/home/ubuntu/nabdah-audit-work/e2e-results', { recursive: true });
fs.writeFileSync(path.join('/home/ubuntu/nabdah-audit-work/e2e-results', 'appointment-sandbox-readiness.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
