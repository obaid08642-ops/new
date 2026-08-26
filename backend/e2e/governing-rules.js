/**
 * GOVERNING-RULES REGRESSION MATRIX (PH-PHARMACY + PH-SERVICE)
 * Run against a seeded staging backend:
 *   BASE_URL=https://staging-api.nabd.plus/api/v1 node e2e/governing-rules.js
 * Each probe asserts ONE binding rule from the commercial contract.
 * Exit code 0 = all rules hold; any failure lists the broken rule IDs.
 */
const BASE = process.env.BASE_URL || 'http://localhost:8002/api/v1';
const PATIENT = process.env.E2E_PATIENT_TOKEN || '';
const results = [];

async function call(path, { method = 'GET', body, token = PATIENT } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Idempotency-Key': `gr-${Math.random().toString(36).slice(2)}${Date.now()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function check(id, ok, note = '') {
  results.push({ id, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${note}`);
}

(async () => {
  // ── PH-PHARMACY R1: creating an order must NOT require/produce a payment ──
  const created = await call('/patient/pharmacy/orders', { method: 'POST', body: {
    items: [{ medicine_id: process.env.E2E_MED_ID || 'seed-med-1', qty: 1 }],
    delivery_address: { label: 'e2e', street: 'x', city: 'Riyadh', lat: 24.7, lng: 46.6 },
    delivery_mode: 'DELIVERY',
  }});
  const orderId = created?.data?.id;
  check('PH-R1-create-no-payment', created.status < 300 && !!orderId, `status=${created.status}`);

  if (!orderId) { console.log('ABORT: no order id'); report(); return; }

  // R2: payment intent BEFORE offer selection must be rejected
  const earlyIntent = await call(`/payments/intent/pharmacy-order/${orderId}`, { method: 'POST' });
  check('PH-R2-no-payment-before-selection', earlyIntent.status >= 400, `status=${earlyIntent.status}`);

  // R3: offers endpoint reachable and empty-safe
  const offers = await call(`/patient/pharmacy/orders/${orderId}/offers`);
  check('PH-R3-offers-readable', offers.status === 200 && Array.isArray(offers.data?.offers), `offers=${offers.data?.offers?.length ?? 'n/a'}`);

  // R4: selecting a NON-existent pharmacy offer is rejected
  const badSelect = await call(`/patient/pharmacy/orders/${orderId}/select-offer`, { method: 'POST', body: { pharmacy_account_id: 'does-not-exist' } });
  check('PH-R4-select-validates-offer', badSelect.status >= 400, `status=${badSelect.status}`);

  // ── PH-SERVICE S1: insurance consultation booking stays UNCONFIRMED ──
  // Requires E2E_DOCTOR_ID + slot seeded in staging.
  if (process.env.E2E_DOCTOR_ID && process.env.E2E_SLOT) {
    const insBook = await call('/care/appointments', { method: 'POST', body: {
      doctor_id: process.env.E2E_DOCTOR_ID, service_type: 'video',
      slot_start: process.env.E2E_SLOT, payment_method: 'insurance',
    }});
    const st = insBook?.data?.status;
    check('PS-S1-insurance-not-confirmed', insBook.status < 300 && String(st).toUpperCase() !== 'CONFIRMED', `status=${st}`);
  } else {
    console.log('SKIP PS-S1 (set E2E_DOCTOR_ID/E2E_SLOT)');
  }

  // ── Security regression spot-probes (from Phase B) ──
  const mint = await call('/nabd-extensions/wallet/credit', { method: 'POST', body: { amount: 999999 } });
  check('SEC-wallet-mint-closed', mint.status >= 400 || mint.data?.error, JSON.stringify(mint.data?.message || '').slice(0, 60));

  const accrue = await call('/finance/ledger/accrue', { method: 'POST', body: { provider_id: 'x', amount: 1, service_type: 'consultation' } });
  check('SEC-ledger-accrue-closed', accrue.status >= 400, `status=${accrue.status}`);

  const exportRes = await call('/users/me/export');
  check('GDPR-export-live', exportRes.status === 200 && !!exportRes.data?.generated_at, `status=${exportRes.status}`);

  report();
})().catch((e) => { console.error(e); report(); });

function report() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} governing rules hold.`);
  if (failed.length) { console.log('BROKEN:', failed.map((f) => f.id).join(', ')); process.exit(1); }
}
