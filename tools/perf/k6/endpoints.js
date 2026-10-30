// Per-endpoint ceiling: each endpoint is driven closed-loop (no think time) by VUS virtual users for DURATION, one after the other,
// so the requests/second and p50/p95 of a route are its own, not those of a mix. Used by docs/perf/load-test-2026-10-30.md.
//   k6 run -e BASE=http://127.0.0.1:8002 -e VUS=16 -e DURATION=15s [-e FIXTURES=/tmp/k6-fixtures.json] [-e ONLY=catalogue,labs] tools/perf/k6/endpoints.js
// Reads are anonymous unless the route needs a patient token (FIXTURES). Writes need ALLOW_WRITES=1 and a non-production BASE.
// Test data only; refuses a BASE that is not a local or staging stack.
import http from 'k6/http';
import { check } from 'k6';

const BASE = (__ENV.BASE || 'http://127.0.0.1:8002').replace(/\/$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE) && !/staging/.test(BASE)) throw new Error('endpoints.js: BASE must be a local or staging stack, never production');
const API = `${BASE}/api/v1`;
const VUS = Number(__ENV.VUS || 16);
const DURATION = __ENV.DURATION || '15s';
const GAP = Number(__ENV.GAP || 3);   // seconds between two endpoints (queues settle)
const FX = __ENV.FIXTURES ? JSON.parse(open(__ENV.FIXTURES)) : null;
const TOKENS = FX ? (FX.patient_tokens || [FX.patient_token]) : [];
const WRITES = __ENV.ALLOW_WRITES === '1';
const RUN = `${Date.now()}`;
const TERMS = ['panadol', 'بنادول', 'vitamin', 'فيتامين', 'insulin', 'augmentin'];
const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dur = (s) => Number(String(s).replace(/s$/, ''));

// [name, kind, request]; kind: public | user | write
const ROUTES = [
  ['catalogue', 'public', () => ({ url: `${API}/public/products/search?locale=${pick(LOCALES)}&limit=20` })],
  ['product_search', 'public', () => ({ url: `${API}/public/products/search?q=${encodeURIComponent(pick(TERMS))}&locale=${pick(LOCALES)}&limit=20` })],
  ['site_search', 'public', () => ({ url: `${API}/search?q=${encodeURIComponent(pick(TERMS))}&locale=${pick(LOCALES)}&limit=10` })],
  ['autocomplete', 'public', () => ({ url: `${API}/medicines/autocomplete?q=${encodeURIComponent(pick(TERMS).slice(0, 3))}` })],
  ['product', 'public', (d) => ({ url: `${API}/public/product/en/${encodeURIComponent(pick(d.slugs))}`, skip: !d.slugs.length })],
  ['category_items', 'public', () => ({ url: `${API}/public/categories/${pick(LOCALES)}/items?limit=20` })],
  ['categories', 'public', () => ({ url: `${API}/public/categories/${pick(LOCALES)}` })],
  ['medicines_list', 'public', () => ({ url: `${API}/public/medicines?limit=30&page=${1 + Math.floor(Math.random() * 5)}` })],
  ['labs_list', 'public', () => ({ url: `${API}/labs/services` })],
  ['radiology_list', 'public', () => ({ url: `${API}/radiology/services` })],
  ['nursing_list', 'public', () => ({ url: `${API}/home-care/services` })],
  ['doctors', 'public', () => ({ url: `${API}/care/doctors?limit=20` })],
  ['doctor', 'public', (d) => ({ url: `${API}/care/doctors/${pick(d.doctorIds)}`, skip: !d.doctorIds.length })],
  ['health', 'public', () => ({ url: `${API}/health/liveness` })],
  ['unread', 'user', () => ({ url: `${API}/notifications/unread-count` })],
  ['appointments', 'user', () => ({ url: `${API}/care/appointments` })],
  ['slots', 'user', (d) => ({ url: `${API}/care/doctors/${FX && FX.doctor_id}/slots?date=${FX && FX.slot_day}&service_type=video`, skip: !(FX && FX.doctor_id) })],
  ['cart_add', 'write', (d) => ({ method: 'POST', url: `${API}/cart/items`, body: JSON.stringify({ medicine_id: pick(d.medicineIds), quantity: 1 }), skip: !d.medicineIds.length })],
  ['chat_send', 'write', () => ({ method: 'POST', url: `${API}/chat/threads/${FX && FX.thread_id}/messages`, body: JSON.stringify({ body: 'perf test data', type: 'text', client_message_id: `ep-${RUN}-${__VU}-${__ITER}` }), skip: !(FX && FX.thread_id) })],
];
const only = __ENV.ONLY ? new Set(__ENV.ONLY.split(',')) : null;
const routes = ROUTES.filter(([n, kind]) => (!only || only.has(n)) && (kind === 'public' || (kind === 'user' && TOKENS.length) || (kind === 'write' && TOKENS.length && WRITES)));

const scenarios = {};
const thresholds = {};
routes.forEach(([name], i) => {
  scenarios[name] = { executor: 'constant-vus', vus: VUS, duration: DURATION, startTime: `${i * (dur(DURATION) + GAP)}s`, exec: 'run', env: { ROUTE: name }, tags: { route: name } };
  thresholds[`http_req_duration{route:${name}}`] = ['p(95)>=0'];
  thresholds[`http_reqs{route:${name}}`] = ['count>=0'];
});
export const options = { scenarios, thresholds, summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'] };

export function setup() {
  const list = http.get(`${API}/public/products/search?locale=en&limit=100`);
  const items = list.status === 200 ? (list.json('items') || []) : [];
  const docs = http.get(`${API}/care/doctors?limit=50`);
  const doctors = docs.status === 200 ? (docs.json('items') || []) : [];
  return { slugs: items.map((p) => p.slug).filter(Boolean), medicineIds: items.map((p) => p.id).filter(Boolean), doctorIds: doctors.map((d) => d.id).filter(Boolean) };
}

export function run(data) {
  const route = __ENV.ROUTE;
  const def = ROUTES.find((r) => r[0] === route);
  const q = def[2](data);
  if (q.skip) return;
  const headers = { 'Content-Type': 'application/json' };
  if (def[1] !== 'public') headers.Authorization = `Bearer ${TOKENS[__VU % TOKENS.length]}`;
  if (q.method === 'POST') headers['Idempotency-Key'] = `${RUN}-${__VU}-${__ITER}`;
  const r = q.method === 'POST' ? http.post(q.url, q.body, { headers, tags: { route } }) : http.get(q.url, { headers, tags: { route } });
  check(r, { ok: (x) => x.status >= 200 && x.status < 400 });
}
