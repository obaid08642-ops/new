// 7C-C2: every admin login path enrolls the browser's device, or the session is
// useless (device_not_enrolled on every call). Run: node_modules/.bin/jiti src/lib/admin-login-device.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import passkeyVerify from '../pages/api/admin/auth/passkey-verify';
import verify2fa from '../pages/api/admin/auth/verify-2fa';
import recovery from '../pages/api/admin/auth/recovery';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const STAFF_TOKEN = `${b64({ alg: 'none' })}.${b64({ sub: 'adm-1', role: 'admin' })}.sig`;

async function login(handler: (req: any, res: any) => Promise<unknown>, body: object, cookies: Record<string, string> = {}, authStatus = 200) {
  process.env.ADMIN_BACKEND_URL = 'http://backend.test';
  const calls: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    calls.push({ url, headers: init?.headers || {}, body: init?.body ? JSON.parse(init.body) : null });
    const enroll = url.endsWith('/admin/devices/enroll');
    const payload = enroll ? { ok: true } : authStatus === 200 ? { token: { accessToken: STAFF_TOKEN, refreshToken: 'r' } } : { code: 'passkey_invalid' };
    return new Response(JSON.stringify(payload), { status: enroll ? 200 : authStatus, headers: { 'content-type': 'application/json' } });
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

// X4: a passkey login does not call the generic enroll (the backend refuses it
// once a passkey exists); it sends this browser's device id with the assertion
// and the backend enrolls the device bound to that credential.
test('passkey login sends the device id with the assertion and sets the same admin_device cookie', async () => {
  const { out, calls } = await login(passkeyVerify, { identifier: 'admin@nabd.test', response: { id: 'c1' } });
  assert.equal(out.status, 200);
  assert.equal(calls.some((c) => c.url.endsWith('/admin/devices/enroll')), false);
  const verify = calls.find((c) => c.url === 'http://backend.test/api/v1/auth/passkey/login/verify');
  const deviceId = verify!.body.device_id;
  assert.ok(typeof deviceId === 'string' && deviceId.length >= 16);
  const cookies: string[] = out.headers['set-cookie'];
  assert.ok(cookies.some((c) => c.startsWith(`admin_device=${deviceId};`) && c.includes('HttpOnly')));
  const again = await login(passkeyVerify, { identifier: 'admin@nabd.test', response: { id: 'c1' } }, { admin_device: 'a'.repeat(64) });
  assert.equal(again.calls[0].body.device_id, 'a'.repeat(64));
});

for (const [name, handler, body] of [
  ['email 2FA (bootstrap) login', verify2fa, { identifier: 'admin@nabd.test', code: '123456' }],
  ['break-glass recovery', recovery, { action: 'redeem', email: 'admin@nabd.test', email_code: '123456', recovery_code: 'ABCD-EFGH' }],
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

test('a rejected passkey or 2FA code never enrolls a device or sets cookies', async () => {
  for (const [handler, body] of [[passkeyVerify, { identifier: 'admin@nabd.test', response: { id: 'c1' } }], [verify2fa, { identifier: 'admin@nabd.test', code: '000000' }]] as const) {
    const { out, calls } = await login(handler, body, {}, 401);
    assert.equal(out.status, 401);
    assert.equal(calls.some((c) => c.url.endsWith('/admin/devices/enroll')), false);
    assert.equal(out.headers['set-cookie'], undefined);
  }
});

test('recovery: start only asks the backend to email a code; redeem needs both codes', async () => {
  const start = await login(recovery, { action: 'start', email: 'admin@nabd.test' });
  assert.equal(start.calls.length, 1);
  assert.equal(start.calls[0].url, 'http://backend.test/api/v1/auth/admin-recovery/start');
  assert.equal(start.out.headers['set-cookie'], undefined);
  const missing = await login(recovery, { action: 'redeem', email: 'admin@nabd.test', email_code: '123456' });
  assert.equal(missing.out.status, 400);
  assert.equal(missing.calls.length, 0);
  const rejected = await login(recovery, { action: 'redeem', email: 'admin@nabd.test', email_code: '123456', recovery_code: 'WRONG' }, {}, 403);
  assert.equal(rejected.out.status, 403);
  assert.equal(rejected.calls.some((c) => c.url.endsWith('/admin/devices/enroll')), false);
  assert.equal(rejected.out.headers['set-cookie'], undefined);
});
