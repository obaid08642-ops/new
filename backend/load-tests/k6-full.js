import http from 'k6/http';
import { check, sleep, group } from 'k6';
export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '90s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
  },
};
const BASE = __ENV.BASE || 'https://www.nabd.plus';
const API = `${BASE}/api/patient`;
export default function () {
  group('guest + labs', () => {
    const g = http.post(`${BASE}/api/auth/guest`, '{}', { headers: { 'Content-Type': 'application/json' } });
    check(g, { 'guest 200': (r) => r.status === 200 });
    const h = g.headers['Set-Cookie'] || '';
    const ck = h ? h.split(',')[0].split(';')[0] : '';
    const r = http.get(`${API}/labs/services`, { headers: { Cookie: ck } });
    check(r, { 'labs 200': (r) => r.status === 200 });
  });
  group('web', () => {
    const r = http.get(`${BASE}/ar`);
    check(r, { 'web 200': (r) => r.status === 200 });
  });
  group('support', () => {
    const g = http.post(`${BASE}/api/auth/guest`, '{}', { headers: { 'Content-Type': 'application/json' } });
    const ck = (g.headers['Set-Cookie'] || '').split(',')[0].split(';')[0];
    const idemp = `k6-${__VU}-${__ITER}`;
    const r = http.post(`${API}/support/requests`, JSON.stringify({ subject: 'k6', message: 'load' }), { headers: { 'Content-Type': 'application/json', Cookie: ck, 'idempotency-key': idemp } });
    check(r, { 'support 201': (r) => r.status === 201 });
  });
  sleep(1);
}
