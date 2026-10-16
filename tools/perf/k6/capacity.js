// P14.2 / P14.27 capacity scenarios (docs/perf/SCALE_ARCHITECTURE.md §5), over the real traffic mix:
// browse, search, product, doctor, logged-in reads, add to cart, payment webhook, booking (slot list + hold), chat,
// call join. Campaign fan-out is one admin action, not a per-user request: fanout.py measures it.
//   k6 run -e BASE=https://staging.example -e SCENARIO=load tools/perf/k6/capacity.js
//   tools/perf/k6/ladder.sh   (the step-by-step ceiling: SCENARIO=constant at rising VUS, one summary per step)
// SCENARIO: smoke | constant | load | stress | spike | soak. PEAK: expected peak VUs (default 300).
// constant: VUS virtual users for DURATION (default 60s) after a 10 s ramp.
// Reads only by default. Logged-in reads need TOKEN (a test patient's bearer token) or FIXTURES (the JSON of
// fixtures.py: per-VU patients, a doctor's bookable day, a booking chat thread, a call session, a paid payment).
// Writes (cart add, slot hold, chat message, call join, payment webhook) need ALLOW_WRITES=1 and a non-production
// BASE; the webhook also needs WEBHOOK_SECRET (the test stack's MOYASAR_WEBHOOK_SECRET). Test data only.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE = (__ENV.BASE || 'http://127.0.0.1:8002').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const PEAK = Number(__ENV.PEAK || 300);
const SCENARIO = __ENV.SCENARIO || 'smoke';
const FX = __ENV.FIXTURES ? JSON.parse(open(__ENV.FIXTURES)) : null;
const TOKENS = FX ? (FX.patient_tokens || [FX.patient_token]) : (__ENV.TOKEN ? [__ENV.TOKEN] : []);
const WRITES = __ENV.ALLOW_WRITES === '1';
if (WRITES && /(^|\.)nabd\.plus(\/|$)/.test(BASE.replace(/^https?:\/\//, '')) && !/staging/.test(BASE)) {
  throw new Error('ALLOW_WRITES is refused against production');
}
const WEBHOOK_SECRET = __ENV.WEBHOOK_SECRET || '';
// idempotency keys are unique per run: a key re-used with another body is refused (and would count as an error)
const RUN = __ENV.RUN_ID || `${Date.now()}`;

const publicApi = new Trend('public_api', true);
const loggedIn = new Trend('logged_in_api', true);
const checkout = new Trend('checkout', true);
const booking = new Trend('booking', true);
const chat = new Trend('chat', true);
const callJoin = new Trend('call_join', true);
const webhook = new Trend('payment_webhook', true);
const errors = new Rate('scenario_errors');
// 429s are the per-IP limits doing their job, not failures: one load generator is one IP. Run from several
// generators (or allow-list them on staging) and report this rate next to the errors.
const rateLimited = new Rate('rate_limited');
// a hold on a slot another patient holds is the right answer under contention, not an error
const slotTaken = new Counter('slot_taken');

const VUS = Number(__ENV.VUS || 50);
const stages = {
  smoke: [{ duration: '20s', target: 5 }],
  constant: [{ duration: '10s', target: VUS }, { duration: __ENV.DURATION || '60s', target: VUS }],
  load: [{ duration: '5m', target: PEAK }, { duration: '20m', target: PEAK }, { duration: '2m', target: 0 }],
  // ramp past the peak until the thresholds break; the step where they break is the measured ceiling
  stress: [1, 2, 3, 4, 6, 8].map((m) => ({ duration: __ENV.STEP || '4m', target: PEAK * m })),
  spike: [{ duration: '2m', target: PEAK }, { duration: '30s', target: PEAK * 10 }, { duration: '3m', target: PEAK * 10 }, { duration: '1m', target: PEAK }],
  soak: [{ duration: '5m', target: Math.round(PEAK * 0.6) }, { duration: __ENV.SOAK || '4h', target: Math.round(PEAK * 0.6) }],
}[SCENARIO];
if (!stages) throw new Error(`unknown SCENARIO ${SCENARIO}`);

const ENDPOINTS = ['catalogue', 'product_search', 'search', 'autocomplete', 'product', 'doctors', 'doctor', 'unread', 'appointments',
  'cart_add', 'slots', 'slot_hold', 'chat_send', 'chat_read', 'call_join', 'payment_webhook'];
// SCALE_ARCHITECTURE §5 starting targets: public reads 300 ms, logged-in 500 ms, transactions 800 ms (p95)
const stop = SCENARIO === 'stress';
export const options = {
  stages,
  // abortOnFail only in stress, so the run stops at the ceiling
  thresholds: {
    public_api: [{ threshold: 'p(95)<300', abortOnFail: stop }],
    logged_in_api: ['p(95)<500'],
    chat: ['p(95)<500'],
    call_join: ['p(95)<500'],
    checkout: ['p(95)<800'],
    booking: ['p(95)<800'],
    payment_webhook: ['p(95)<800'],
    scenario_errors: [{ threshold: 'rate<0.005', abortOnFail: stop }],
    // per-endpoint latency in the summary (always true): which request is the first bottleneck
    ...Object.fromEntries(ENDPOINTS.map((n) => [`http_req_duration{name:${n}}`, ['p(95)>=0']])),
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const TERMS = ['panadol', 'بنادول', 'vitamin', 'فيتامين', 'insulin', 'augmentin'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const ok = (r, name, accept = []) => {
  rateLimited.add(r.status === 429);
  if (r.status === 429) return false;
  const good = (r.status >= 200 && r.status < 400) || accept.includes(r.status);
  errors.add(!good);
  check(r, { [name]: () => good });
  return good;
};
const auth = (token, extra = {}) => ({ headers: Object.assign({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, extra) });

export function setup() {
  // real slugs and doctor ids from the target, never invented ones
  const list = http.get(`${API}/public/products/search?locale=en&limit=100`);
  const items = list.status === 200 ? (list.json('items') || []) : [];
  const docs = http.get(`${API}/care/doctors?limit=50`);
  const doctors = docs.status === 200 ? (docs.json('items') || []) : [];
  let slots = [];
  if (FX && FX.doctor_id) {
    const s = http.get(`${API}/care/doctors/${FX.doctor_id}/slots?date=${FX.slot_day}&service_type=video`, auth(TOKENS[0]));
    slots = s.status === 200 ? (s.json('slots') || []).map((x) => x.start).filter(Boolean) : [];
  }
  return {
    slugs: items.map((p) => p.slug).filter(Boolean),
    medicineIds: items.map((p) => p.id).filter(Boolean),
    doctorIds: doctors.map((d) => d.id).filter(Boolean),
    slots,
  };
}

export default function (data) {
  const locale = pick(LOCALES);
  const token = TOKENS.length ? TOKENS[__VU % TOKENS.length] : '';
  group('browse + search (public)', () => {
    let r = http.get(`${API}/public/products/search?locale=${locale}&limit=20`, { tags: { name: 'catalogue' } });
    publicApi.add(r.timings.duration); ok(r, 'catalogue');
    r = http.get(`${API}/public/products/search?q=${encodeURIComponent(pick(TERMS))}&locale=${locale}&limit=20`, { tags: { name: 'product_search' } });
    publicApi.add(r.timings.duration); ok(r, 'product search');
    r = http.get(`${API}/search?q=${encodeURIComponent(pick(TERMS))}&locale=${locale}&limit=10`, { tags: { name: 'search' } });
    publicApi.add(r.timings.duration); ok(r, 'search');
    r = http.get(`${API}/medicines/autocomplete?q=${encodeURIComponent(pick(TERMS).slice(0, 3))}`, { tags: { name: 'autocomplete' } });
    publicApi.add(r.timings.duration); ok(r, 'autocomplete');
  });
  if (data.slugs.length) group('product page data', () => {
    const r = http.get(`${API}/public/product/en/${encodeURIComponent(pick(data.slugs))}`, { tags: { name: 'product' } });
    publicApi.add(r.timings.duration); ok(r, 'product');
  });
  group('doctors', () => {
    let r = http.get(`${API}/care/doctors?limit=20`, { tags: { name: 'doctors' } });
    publicApi.add(r.timings.duration); ok(r, 'doctors');
    if (data.doctorIds.length) {
      r = http.get(`${API}/care/doctors/${pick(data.doctorIds)}`, { tags: { name: 'doctor' } });
      publicApi.add(r.timings.duration); ok(r, 'doctor');
    }
  });
  if (token && chance(0.5)) group('logged in', () => {
    let r = http.get(`${API}/notifications/unread-count`, Object.assign({ tags: { name: 'unread' } }, auth(token)));
    loggedIn.add(r.timings.duration); ok(r, 'unread');
    r = http.get(`${API}/care/appointments`, Object.assign({ tags: { name: 'appointments' } }, auth(token)));
    loggedIn.add(r.timings.duration); ok(r, 'appointments');
  });
  if (!(token && WRITES)) return sleep(1 + Math.random() * 2);

  if (data.medicineIds.length && chance(0.15)) group('add to cart', () => {
    const r = http.post(`${API}/cart/items`, JSON.stringify({ medicine_id: pick(data.medicineIds), quantity: 1 }),
      Object.assign({ tags: { name: 'cart_add' } }, auth(token, { 'Idempotency-Key': `k6-cart-${RUN}-${__VU}-${__ITER}` })));
    checkout.add(r.timings.duration); ok(r, 'cart add');
  });
  if (FX && data.slots.length && chance(0.05)) group('booking: slot list + hold', () => {
    let r = http.get(`${API}/care/doctors/${FX.doctor_id}/slots?date=${FX.slot_day}&service_type=video`, Object.assign({ tags: { name: 'slots' } }, auth(token)));
    booking.add(r.timings.duration); ok(r, 'slots');
    r = http.post(`${API}/slot-locks/reserve`, JSON.stringify({ provider_id: FX.doctor_id, booking_kind: 'consultation', slot_start: pick(data.slots) }),
      Object.assign({ tags: { name: 'slot_hold' } }, auth(token, { 'Idempotency-Key': `k6-hold-${RUN}-${__VU}-${__ITER}` })));
    booking.add(r.timings.duration);
    if (r.status === 409) slotTaken.add(1);
    ok(r, 'slot hold', [409]);
  });
  if (FX && FX.thread_id && chance(0.1)) group('chat', () => {
    // the booking thread belongs to the fixture patient: chat is driven by that account
    let r = http.post(`${API}/chat/threads/${FX.thread_id}/messages`, JSON.stringify({ body: 'capacity test (test data)', type: 'text', client_message_id: `k6-${RUN}-${__VU}-${__ITER}` }),
      Object.assign({ tags: { name: 'chat_send' } }, auth(FX.patient_token, { 'Idempotency-Key': `k6-chat-${RUN}-${__VU}-${__ITER}` })));
    chat.add(r.timings.duration); ok(r, 'chat send');
    r = http.get(`${API}/chat/threads/${FX.thread_id}/messages`, Object.assign({ tags: { name: 'chat_read' } }, auth(FX.patient_token)));
    chat.add(r.timings.duration); ok(r, 'chat read');
  });
  if (FX && FX.call_session_id && chance(0.02)) group('call join', () => {
    const r = http.post(`${API}/calls/${FX.call_session_id}/join`, '{}', Object.assign({ tags: { name: 'call_join' } }, auth(FX.patient_token)));
    callJoin.add(r.timings.duration); ok(r, 'call join');
  });
  if (FX && FX.gateway_payment_id && WEBHOOK_SECRET && chance(0.03)) group('payment webhook', () => {
    // the gateway re-sends the paid event of a real (test) payment: signature check, dedup, settled-state read
    const body = { id: `k6-evt-${RUN}-${__VU}-${__ITER}`, type: 'payment_paid', data: { id: FX.gateway_payment_id, status: 'paid' }, secret_token: WEBHOOK_SECRET };
    const r = http.post(`${API}/webhooks/moyasar`, JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'payment_webhook' } });
    webhook.add(r.timings.duration); ok(r, 'payment webhook');
  });
  sleep(1 + Math.random() * 2);
}
