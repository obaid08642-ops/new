import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// 60 requests/s for DURATION seconds: GET and POST (a POST is never retried by nginx after it was sent, the hard case)
const seen = { v1: new Counter('served_v1'), v2: new Counter('served_v2'), v3: new Counter('served_v3') };
export const options = {
  scenarios: {
    steady: { executor: 'constant-arrival-rate', rate: 60, timeUnit: '1s', duration: `${__ENV.DURATION || 120}s`, preAllocatedVUs: 40, maxVUs: 200 },
  },
  thresholds: { http_req_failed: ['rate==0'], checks: ['rate==1'] },
};
export default function () {
  const post = Math.random() < 0.3;
  const r = post ? http.post(`${__ENV.BASE}/api/v1/orders`, 'x'.repeat(200)) : http.get(`${__ENV.BASE}/api/v1/ping`);
  check(r, { 'status 200': (x) => x.status === 200 });
  try { const v = r.json('v'); if (seen[v]) seen[v].add(1); } catch (e) { /* counted as a failed check above */ }
}
