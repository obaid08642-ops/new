// ACCEPTANCE — S-6 rate limits (owner decision 2026-10-06 item 28, security sweep; Queue C D-28). Written
// by the reviewer before the work; the implementing agent makes it pass and may not edit it (nor
// live-server.ts next to it).
//
// The whole compiled backend runs as TWO instances (dist/main.js, as production runs more than one) on
// an in-memory MongoDB and one local Redis. Requests alternate between the two instances, from one
// client IP.
//
// Required
//   1. docs/security/RATE_LIMITS.md documents the limit of every route below, one table row per route:
//        | `POST /api/v1/auth/login` | <limit> | <window seconds> |
//      (method and full path in backticks, then two whole numbers). Ceilings: sign-in, sign-up, OTP,
//      2FA, social sign-in and password reset at most 10 requests per 60 s; routes that call a paid
//      service (AI, OCR, SMS, email) at most 20 per 60 s.
//   2. The documented limit holds across instances, per client IP: `limit` requests spread over both
//      instances are not refused with 429, and the next one is answered 429 with a `Retry-After`
//      header of a whole number of seconds >= 1.
//   A route that no longer exists (404) is not required.
import * as fs from 'fs';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(900_000);

const DOC = path.resolve(__dirname, '../../../docs/security/RATE_LIMITS.md');
const AUTH = ['login', 'register', 'otp/request', 'otp/verify', 'send-otp', 'verify-otp', 'password/forgot', 'password/reset', 'reset-password', 'login/verify-2fa', 'social-login']
  .map((p) => `POST /api/v1/auth/${p}`);
const PAID = ['assistant', 'triage', 'voice-to-order', 'prescription-ocr', 'copilot/suggest', 'ocr-translate', 'medicine-image-search', 'barcode-lookup', 'analyze-meal', 'analyze-report', 'generate-exercise-plan', 'generate-diet-plan']
  .map((p) => `POST /api/v1/ai/${p}`);

type Row = { limit: number; window: number };
const readDoc = (): Map<string, Row> => {
  const rows = new Map<string, Row>();
  if (!fs.existsSync(DOC)) return rows;
  for (const line of fs.readFileSync(DOC, 'utf8').split('\n')) {
    const m = /^\|\s*`(GET|POST|PUT|PATCH|DELETE) (\/api\/v1\/[^`\s]+)`\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/.exec(line);
    if (m) rows.set(`${m[1]} ${m[2]}`, { limit: Number(m[3]), window: Number(m[4]) });
  }
  return rows;
};

describe('S-6: rate limits on sign-in and paid services, shared across instances', () => {
  const stack = new LiveStack();
  let patient = '';
  const doc = readDoc();

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(2);
    patient = await stack.patient('pat-1');
  });
  afterAll(async () => { await stack.stop(); });

  const routeExists = async (r: string) => {
    const [method, p] = r.split(' ');
    // Instance 1 only: a 404 here means the route is gone. Every other status means it exists.
    const res = await stack.call(1, method, p, r.startsWith('POST /api/v1/ai/') ? patient : undefined, {});
    return res.status !== 404;
  };

  it('docs/security/RATE_LIMITS.md documents every required route within its ceiling', async () => {
    const missing: string[] = [];
    const tooHigh: string[] = [];
    for (const r of [...AUTH, ...PAID]) {
      const row = doc.get(r);
      if (!row) { missing.push(r); continue; }
      const perMinute = (row.limit * 60) / row.window;
      if (perMinute > (AUTH.includes(r) ? 10 : 20) || row.limit < 1 || row.window < 1) tooHigh.push(`${r} ${row.limit}/${row.window}s`);
    }
    expect({ missing, tooHigh }).toEqual({ missing: [], tooHigh: [] });
  });

  [...AUTH, ...PAID].forEach((r) => {
    it(`${r}: the limit holds across both instances, then 429 with Retry-After`, async () => {
      // The existence check is request 1 (instance 1).
      if (!(await routeExists(r))) return;
      const row = doc.get(r);
      const ceiling = AUTH.includes(r) ? 10 : 20;
      const limit = row ? row.limit : ceiling;
      const [method, p] = r.split(' ');
      const token = r.startsWith('POST /api/v1/ai/') ? patient : undefined;
      const statuses: number[] = [];
      for (let n = 2; n <= limit + 1; n++) statuses.push((await stack.call(n % 2, method, p, token, {})).status);
      const first429 = statuses.indexOf(429);
      if (row) {
        // documented: exactly `limit` requests pass the limiter, the next is refused
        expect({ refused_at: first429 + 2 }).toEqual({ refused_at: limit + 1 });
      } else {
        // undocumented (already failed above): at least refused within the ceiling
        expect(first429).toBeGreaterThanOrEqual(0);
      }
      const over = await stack.call(0, method, p, token, {});
      expect(over.status).toBe(429);
      const retry = String(over.headers.get('retry-after') ?? '');
      expect(retry).toMatch(/^\d+$/);
      expect(Number(retry)).toBeGreaterThanOrEqual(1);
    });
  });
});
