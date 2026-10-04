// 7C-C2: every admin login path enrolls the browser's device, or the session is
// useless (device_not_enrolled on every call). Run: node_modules/.bin/jiti src/lib/admin-login-device.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import passkeyVerify from '../pages/api/admin/auth/passkey-verify';
import verify2fa from '../pages/api/admin/auth/verify-2fa';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const STAFF_TOKEN = `${b64({ alg: 'none' })}.${b64({ sub: 'adm-1', role: 'admin' })}.sig`;

async function login(handler: (req: any, res: any) => Promise<unknown>, body: object, cookies: Record<string, string> = {}) {
  process.env.ADMIN_BACKEND_URL = 'http://backend.test';
  const calls: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    calls.push({ url, headers: init?.headers || {}, body: init?.body ? JSON.parse(init.body) : null });
    const payload = url.endsWith('/admin/devices/enroll') ? { ok: true } : { token: { accessToken: STAFF_TOKEN, refreshToken: 'r' } };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const out: { status?: number; headers: Record<string, any>; body?: any } = { headers: {} };
  const res = {
    status(c: number) { out.status = c; return this; },
    json(b: any) { out.body = b; return this; },
    setHeader(k: string, v: any) { out.headers[k.toLowerCase()] = v; },
  };
  try {
    await handler({ method: 'POST', body, cookies }, res);
  } finally {
    globalThis.fetch = realFetch;
  }
  return { out, calls };
}

for (const [name, handler, body] of [
  ['passkey login', passkeyVerify, { identifier: 'admin@nabd.test', response: { id: 'c1' } }],
  ['email 2FA login', verify2fa, { identifier: 'admin@nabd.test', code: '123456' }],
] as const) {
  test(`${name} enrolls a new browser's device and sets the admin_device cookie`, async () => {
    const { out, calls } = await login(handler, body);
    assert.equal(out.status, 200);
    const enroll = calls.find((c) => c.url === 'http://backend.test/api/v1/admin/devices/enroll');
    assert.ok(enroll, 'device enroll call');
    assert.equal(enroll!.headers.authorization, `Bearer ${STAFF_TOKEN}`);
    const deviceId = enroll!.body.device_id;
    assert.ok(typeof deviceId === 'string' && deviceId.length >= 16);
    assert.equal(enroll!.headers['x-admin-device'], deviceId);
    const cookies: string[] = out.headers['set-cookie'];
    assert.ok(cookies.some((c) => c.startsWith(`admin_device=${deviceId};`) && c.includes('HttpOnly')));
  });

  test(`${name} keeps an existing browser device id`, async () => {
    const existing = 'a'.repeat(64);
    const { calls } = await login(handler, body, { admin_device: existing });
    assert.equal(calls.find((c) => c.url.endsWith('/admin/devices/enroll'))!.body.device_id, existing);
  });
}
