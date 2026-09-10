import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '60s', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};
const BASE = __ENV.BASE || 'https://www.nabd.plus';
export default function () {
  const r1 = http.get(`${BASE}/api/patient/labs/services`, { tags: { name: 'labs' } });
  check(r1, { 'labs 200': (r) => r.status === 200 });
  const r2 = http.get(`${BASE}/ar`, { tags: { name: 'web' } });
  check(r2, { 'web 200': (r) => r.status === 200 });
  sleep(1);
}
