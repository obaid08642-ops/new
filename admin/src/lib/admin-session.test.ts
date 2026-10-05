// R11 §5 lead 15. Run: node_modules/.bin/jiti src/lib/admin-session.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../pages/api/admin/[...path]';
import login from '../pages/api/admin/auth/login';

const jwt = (payload: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
const ADMIN = jwt({ sub: 'a1', id: 'a1', role: 'admin', tv: 0 });
const PATIENT = jwt({ sub: 'p1', id: 'p1', role: 'patient', tv: 0 });

function res() {
  const out = { statusCode: 200, headers: {} as Record<string, unknown>, body: undefined as unknown, cookies: [] as string[] };
  return Object.assign(out, {
    status(code: number) { out.statusCode = code; return this; },
    json(body: unknown) { out.body = body; return this; },
    setHeader(k: string, v: unknown) { out.headers[k.toLowerCase()] = v; if (k.toLowerCase() === 'set-cookie') out.cookies.push(...([] as string[]).concat(v as string)); return this; },
    appendHeader(k: string, v: string) { if (k.toLowerCase() === 'set-cookie') out.cookies.push(v); return this; },
    end() { return this; },
  });
}
const req = (cookies: Record<string, string>, extra: Record<string, unknown> = {}) =>
  ({ method: 'GET', headers: {}, cookies, query: { path: ['admin', 'users'] }, socket: { remoteAddress: '127.0.0.1' }, ...extra });

process.env.ADMIN_BACKEND_URL = 'http://backend.test';
process.env.ADMIN_GATE_TOKEN = 'gate';

test('a patient token in admin_access is not forwarded with the gate token', async () => {
  const calls: unknown[] = [];
  globalThis.fetch = (async (...a: unknown[]) => { calls.push(a); return new Response('{}', { status: 200 }); }) as typeof fetch;
  const r = res();
  await handler(req({ admin_access: PATIENT }) as never, r as never);
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('an admin token is forwarded, and a new admin_device cookie is Secure in production', async () => {
  const calls: [string, RequestInit][] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => { calls.push([url, init]); return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }); }) as typeof fetch;
  const env = process.env as Record<string, string>;
  const prev = env.NODE_ENV;
  env.NODE_ENV = 'production';
  const r = res();
  await handler(req({ admin_access: ADMIN }) as never, r as never);
  env.NODE_ENV = prev;
  assert.equal(calls.length, 1);
  assert.equal(new Headers(calls[0][1].headers).get('x-admin-gate-token'), 'gate');
  const device = r.cookies.find((c) => c.startsWith('admin_device='));
  assert.ok(device && /; Secure/.test(device), `admin_device cookie: ${device}`);
});

test('the admin login refuses a patient account', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ token: { accessToken: PATIENT, refreshToken: 'r' } }), { status: 200 })) as typeof fetch;
  const r = res();
  await login({ method: 'POST', body: { identifier: 'p@example.test', password: 'x' }, headers: {}, cookies: {} } as never, r as never);
  assert.equal(r.statusCode, 403);
  assert.equal(r.cookies.length, 0);
});

// Second review: finance and support staff use the admin dashboard too; the
// backend gates them (isPlatformStaffRole). Patients and providers do not.
test('staffRoleOf admits every platform staff role and nothing else', async () => {
  const { staffRoleOf } = await import('./admin-session');
  for (const role of ['admin', 'super_admin', 'support_agent', 'finance']) assert.equal(staffRoleOf(jwt({ sub: 'x', role })), role);
  for (const role of ['patient', 'doctor', 'pharmacy', 'hospital_admin']) assert.equal(staffRoleOf(jwt({ sub: 'x', role })), null);
  assert.equal(staffRoleOf(jwt({ sub: 'x', role: 'finance', type: 'refresh' })), null);
});
