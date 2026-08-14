import fs from 'node:fs';
import path from 'node:path';

const baseUrl = (process.env.NABDAH_E2E_BASE_URL || 'https://api.nabd.plus/api/v1').replace(/\/$/, '');
const password = process.env.NABDAH_E2E_SANDBOX_PASSWORD;
const patientIdentifier = process.env.NABDAH_E2E_PATIENT_IDENTIFIER;
const providerIdentifier = process.env.NABDAH_E2E_PROVIDER_IDENTIFIER;
const providerProfileId = process.env.NABDAH_E2E_PROVIDER_PROFILE_ID;
if (![password, patientIdentifier, providerIdentifier, providerProfileId].every(Boolean)) throw new Error('MISSING_EPHEMERAL_APPOINTMENT_E2E_CONFIGURATION');

async function json(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}
async function login(pathname, identifier, useEmail = false) {
  const { response, body } = await json(`${baseUrl}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(useEmail ? { email: identifier, password } : { identifier, password }) });
  const token = body?.token?.accessToken || body?.token || body?.access_token;
  return { status: response.status, token: typeof token === 'string' ? token : undefined };
}
function auth(token) { return { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' }; }
function dateKey(offset) { const d = new Date(Date.now() + offset * 86400000); return d.toISOString().slice(0, 10); }

const [patient, provider] = await Promise.all([login('/auth/login', patientIdentifier), login('/provider/auth/login', providerIdentifier, true)]);
if (!patient.token || !provider.token) throw new Error('SANDBOX_AUTHENTICATION_FAILED');

const detail = await json(`${baseUrl}/care/doctors/${encodeURIComponent(providerProfileId)}`, { headers: { authorization: `Bearer ${patient.token}`, accept: 'application/json' } });
let slotResult = { status: null, selected: false };
let slotStart = null;
if (detail.response.ok && Array.isArray(detail.body?.consultation_modes) && detail.body.consultation_modes.includes('clinic')) {
  for (let offset = 2; offset <= 14 && !slotStart; offset += 1) {
    const slots = await json(`${baseUrl}/care/doctors/${encodeURIComponent(providerProfileId)}/slots?date=${dateKey(offset)}&service_type=clinic`, { headers: { authorization: `Bearer ${patient.token}`, accept: 'application/json' } });
    slotResult = { status: slots.response.status, selected: false };
    const candidate = Array.isArray(slots.body?.slots) ? slots.body.slots.find((item) => item?.available && typeof item?.start === 'string') : null;
    if (candidate) { slotStart = candidate.start; slotResult.selected = true; }
  }
}

async function createAppointment(paymentMethod, note) {
  if (!slotStart) return { status: null, id: null };
  const { response, body } = await json(`${baseUrl}/care/appointments`, { method: 'POST', headers: auth(patient.token), body: JSON.stringify({ doctor_id: providerProfileId, service_type: 'clinic', slot_start: slotStart, duration_minutes: 30, payment_method: paymentMethod, patient_notes: note, symptoms: [] }) });
  return { status: response.status, id: typeof body?.id === 'string' ? body.id : null };
}
async function patientCancel(id) {
  if (!id) return null;
  const { response } = await json(`${baseUrl}/care/appointments/${encodeURIComponent(id)}/cancel`, { method: 'PATCH', headers: auth(patient.token), body: JSON.stringify({ reason: 'e2e_sandbox_cleanup' }) });
  return response.status;
}
async function providerAction(id, action) {
  if (!id) return null;
  const { response } = await json(`${baseUrl}/provider/jobs/consultation/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: auth(provider.token), body: JSON.stringify({ reason: `e2e_sandbox_${action}` }) });
  return response.status;
}

const cashAppointment = await createAppointment('cash', 'e2e-sandbox-cash-cleanup');
const cashCancellationStatus = await patientCancel(cashAppointment.id);
const cardAppointment = await createAppointment('card', 'e2e-sandbox-provider-lifecycle');
const acceptStatus = await providerAction(cardAppointment.id, 'accept');
const startStatus = acceptStatus >= 200 && acceptStatus < 300 ? await providerAction(cardAppointment.id, 'start') : null;
const completeStatus = startStatus >= 200 && startStatus < 300 ? await providerAction(cardAppointment.id, 'complete') : null;
const cardCleanupStatus = completeStatus >= 200 && completeStatus < 300 ? null : await patientCancel(cardAppointment.id);

const artifact = {
  generatedAt: new Date().toISOString(),
  mode: 'sandbox appointment lifecycle; cash create/cancel plus card create/provider transitions, no payment initiation',
  patientLoginStatus: patient.status,
  providerLoginStatus: provider.status,
  providerDetailStatus: detail.response.status,
  clinicSupported: Boolean(detail.body?.consultation_modes?.includes('clinic')),
  slotQuery: slotResult,
  cashCreateStatus: cashAppointment.status,
  cashCancellationStatus,
  cardCreateStatus: cardAppointment.status,
  providerAcceptStatus: acceptStatus,
  providerStartStatus: startStatus,
  providerCompleteStatus: completeStatus,
  cardCleanupStatus,
  paymentInitiationCalls: 0,
  rawIdentifiersStored: false,
};
fs.mkdirSync('/home/ubuntu/nabdah-audit-work/e2e-results', { recursive: true });
fs.writeFileSync(path.join('/home/ubuntu/nabdah-audit-work/e2e-results', 'appointment-provider-lifecycle-e2e.json'), JSON.stringify(artifact, null, 2));
console.log(JSON.stringify(artifact, null, 2));
