// P14.2 / P14.27 capacity scenarios (docs/perf/SCALE_ARCHITECTURE.md §5).
//   k6 run -e BASE=https://staging.example -e SCENARIO=load tools/perf/k6/capacity.js
// SCENARIO: smoke | load | stress | spike | soak. PEAK: expected peak VUs (default 300).
// Reads only by default. Logged-in reads need TOKEN (a test patient's bearer token). Checkout writes need
// ALLOW_WRITES=1 and a non-production BASE: they use the test gateway (fake_pay) and test-mode data only.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = (__ENV.BASE || 'http://127.0.0.1:8002').replace(/\/$/, '');
const API = `${BASE}/api/v1`;
const PEAK = Number(__ENV.PEAK || 300);
const SCENARIO = __ENV.SCENARIO || 'smoke';
const TOKEN = __ENV.TOKEN || '';
const WRITES = __ENV.ALLOW_WRITES === '1';
if (WRITES && /(^|\.)nabd\.plus(\/|$)/.test(BASE.replace(/^https?:\/\//, '')) && !/staging/.test(BASE)) {
  throw new Error('ALLOW_WRITES is refused against production');
}

const publicApi = new Trend('public_api', true);
const loggedIn = new Trend('logged_in_api', true);
const checkout = new Trend('checkout', true);
const errors = new Rate('scenario_errors');
// 429s are the per-IP limits doing their job, not failures: one load generator is one IP. Run from several
// generators (or allow-list them on staging) and report this rate next to the errors.
const rateLimited = new Rate('rate_limited');

const stages = {
  smoke: [{ duration: '20s', target: 5 }],
  load: [{ duration: '5m', target: PEAK }, { duration: '20m', target: PEAK }, { duration: '2m', target: 0 }],
  // ramp past the peak until the thresholds break; the step where they break is the measured ceiling
  stress: [1, 2, 3, 4, 6, 8].map((m) => ({ duration: '4m', target: PEAK * m })),
  spike: [{ duration: '2m', target: PEAK }, { duration: '30s', target: PEAK * 10 }, { duration: '3m', target: PEAK * 10 }, { duration: '1m', target: PEAK }],
  soak: [{ duration: '5m', target: Math.round(PEAK * 0.6) }, { duration: '4h', target: Math.round(PEAK * 0.6) }],
}[SCENARIO];
if (!stages) throw new Error(`unknown SCENARIO ${SCENARIO}`);

export const options = {
  stages,
  // SCALE_ARCHITECTURE §5 starting targets; abortOnFail only in stress, so the run stops at the ceiling
  thresholds: {
    public_api: [{ threshold: 'p(95)<300', abortOnFail: SCENARIO === 'stress' }],
    logged_in_api: ['p(95)<500'],
    checkout: ['p(95)<800'],
    scenario_errors: [{ threshold: 'rate<0.005', abortOnFail: SCENARIO === 'stress' }],
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const TERMS = ['panadol', 'بنادول', 'vitamin', 'فيتامين', 'insulin', 'augmentin'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ok = (r, name) => {
  rateLimited.add(r.status === 429);
  if (r.status === 429) return false;
  const good = r.status >= 200 && r.status < 400;
  errors.add(!good);
  check(r, { [name]: () => good });
  return good;
};

export function setup() {
  // real slugs and doctor ids from the target, never invented ones
  const list = http.get(`${API}/public/products/search?locale=en&limit=100`);
  const items = list.status === 200 ? (list.json('items') || []) : [];
  const docs = http.get(`${API}/doctors?limit=50`);
  const doctors = docs.status === 200 ? ((docs.json('items') || docs.json('data') || docs.json()) || []) : [];
  return {
    slugs: items.map((p) => p.slug).filter(Boolean),
    medicineIds: items.map((p) => p.id).filter(Boolean),
    doctorIds: (Array.isArray(doctors) ? doctors : []).map((d) => d.id || d._id).filter(Boolean),
  };
}

export default function (data) {
  const locale = pick(LOCALES);
  group('browse + search (public)', () => {
    let r = http.get(`${API}/public/products/search?locale=${locale}&limit=20`, { tags: { name: 'catalogue' } });
    publicApi.add(r.timings.duration); ok(r, 'catalogue');
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
    let r = http.get(`${API}/doctors?limit=20`, { tags: { name: 'doctors' } });
    publicApi.add(r.timings.duration); ok(r, 'doctors');
    if (data.doctorIds.length) {
      r = http.get(`${API}/doctors/${pick(data.doctorIds)}`, { tags: { name: 'doctor' } });
      publicApi.add(r.timings.duration); ok(r, 'doctor');
    }
  });
  if (TOKEN) group('logged in', () => {
    const h = { headers: { Authorization: `Bearer ${TOKEN}` } };
    let r = http.get(`${API}/notifications/unread-count`, Object.assign({ tags: { name: 'unread' } }, h));
    loggedIn.add(r.timings.duration); ok(r, 'unread');
    r = http.get(`${API}/doctors/appointments/mine`, Object.assign({ tags: { name: 'appointments' } }, h));
    loggedIn.add(r.timings.duration); ok(r, 'appointments');
  });
  if (TOKEN && WRITES && data.medicineIds.length) group('checkout (test gateway)', () => {
    const h = { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'Idempotency-Key': `k6-${__VU}-${__ITER}` } };
    const r = http.post(`${API}/cart/items`, JSON.stringify({ medicine_id: pick(data.medicineIds), quantity: 1 }), Object.assign({ tags: { name: 'cart_add' } }, h));
    checkout.add(r.timings.duration); ok(r, 'cart add');
  });
  sleep(1 + Math.random() * 2);
}
