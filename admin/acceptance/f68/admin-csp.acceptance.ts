// ACCEPTANCE — F68 (owner change, 2026-10-05), admin dashboard part.
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
// Run: cd admin && node_modules/.bin/jiti acceptance/f68/admin-csp.acceptance.ts
//
// Every admin page (the sign-in page and every /admin/* page) is a signed-in
// surface: a per-request NONCE CSP ('nonce-…' + 'strict-dynamic', fresh each
// request, no 'unsafe-inline' / 'unsafe-eval' for scripts) and Cache-Control:
// no-store, with frame-ancestors 'none'. HSTS (>= 1 year, includeSubDomains) is
// kept in production. The session-presence redirect to /login stays.
// Seam under test: `proxy` exported from admin/src/proxy.ts (and its `config.matcher`)
// and the `headers()` of admin/next.config.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

(process.env as Record<string, string>).NODE_ENV = 'production';

const ORIGIN = 'https://admin.nabd.plus';
const directive = (policy: string, name: string) => (policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || '');

async function hit(path: string, cookie?: string) {
  const { proxy } = await import('../../src/proxy');
  const headers: Record<string, string> = { accept: 'text/html' };
  if (cookie) headers.cookie = cookie;
  return proxy(new NextRequest(new URL(path, ORIGIN), { headers })) as Response;
}

for (const path of ['/admin/command-center', '/admin/security', '/admin/finance/payouts', '/admin/users']) {
  test(`${path} (signed in): fresh nonce CSP, strict-dynamic, no unsafe-inline, no-store, frame-ancestors none`, async () => {
    const a = await hit(path, 'admin_access=a.b.c');
    const b = await hit(path, 'admin_access=a.b.c');
    const ca = a.headers.get('content-security-policy') || '';
    const cb = b.headers.get('content-security-policy') || '';
    const na = /'nonce-([^']+)'/.exec(directive(ca, 'script-src'))?.[1];
    const nb = /'nonce-([^']+)'/.exec(directive(cb, 'script-src'))?.[1];
    assert.ok(na, `no nonce in script-src: ${ca}`);
    assert.ok(nb);
    assert.notEqual(na, nb, 'nonce must change per request');
    assert.ok(directive(ca, 'script-src').includes("'strict-dynamic'"));
    assert.ok(!directive(ca, 'script-src').includes("'unsafe-inline'"));
    assert.ok(!directive(ca, 'script-src').includes("'unsafe-eval'"));
    assert.equal(directive(ca, 'frame-ancestors'), "frame-ancestors 'none'");
    assert.ok((a.headers.get('cache-control') || '').toLowerCase().includes('no-store'), 'admin HTML must be no-store');
  });
}

test('without a session an /admin page still redirects to /login, and that answer is no-store', async () => {
  const r = await hit('/admin/command-center');
  assert.ok([302, 303, 307, 308].includes(r.status), `status ${r.status}`);
  assert.match(r.headers.get('location') || '', /\/login/);
  assert.ok((r.headers.get('cache-control') || '').toLowerCase().includes('no-store'));
});

test('the sign-in page is covered too: nonce CSP and no-store', async () => {
  const mod = await import('../../src/proxy');
  const matcher = JSON.stringify((mod as { config?: { matcher?: unknown } }).config?.matcher || '');
  assert.match(matcher, /login|\(\?!|\/:path\*|\/\(\.\*\)/, `proxy matcher does not reach /login: ${matcher}`);
  const r = await hit('/login');
  const policy = r.headers.get('content-security-policy') || '';
  assert.match(directive(policy, 'script-src'), /'nonce-[^']+'/);
  assert.ok((r.headers.get('cache-control') || '').toLowerCase().includes('no-store'));
});

test('next.config headers(): HSTS >= 1 year with includeSubDomains, framing denied, in production', async () => {
  const cfg = (await import('../../next.config')).default as { headers?: () => Promise<Array<{ headers: Array<{ key: string; value: string }> }>> };
  assert.equal(typeof cfg.headers, 'function');
  const all = (await cfg.headers!()).flatMap((r) => r.headers);
  const hsts = all.find((h) => h.key.toLowerCase() === 'strict-transport-security')?.value || '';
  assert.ok(Number(/max-age=(\d+)/.exec(hsts)?.[1] || 0) >= 31536000, `HSTS: ${hsts}`);
  assert.ok(hsts.includes('includeSubDomains'));
  const xfo = all.find((h) => h.key.toLowerCase() === 'x-frame-options')?.value || '';
  const csp = all.find((h) => h.key.toLowerCase() === 'content-security-policy')?.value || '';
  assert.ok(xfo.toUpperCase() === 'DENY' || /frame-ancestors 'none'/.test(csp));
});
