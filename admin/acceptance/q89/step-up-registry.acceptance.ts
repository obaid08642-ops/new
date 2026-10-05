// ACCEPTANCE — Q89 + R23 (REVIEW_REAUDIT Round 12 Phase A #5). Written by the
// reviewer before the fix; the implementing agent makes it pass and may not edit
// it. Step-up (fresh passkey) plus a named permission on every remaining money /
// privilege admin route (the Q66 list), a step-up ceremony that is single-use and
// bound to the session, and a usable admin step-up prompt.
// R23. Run: node_modules/.bin/jiti acceptance/q89/step-up-registry.acceptance.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendWithStepUp, setStepUpPrompt, stepUpActionFor } from '../../src/lib/step-up-registry';

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('a step-up 403 asks the prompt for the exact backend action and retries once with the token', async () => {
  const asked: string[] = [];
  setStepUpPrompt(async (action) => { asked.push(action); return 'tok-1'; });
  const sent: Array<string | null> = [];
  const out = await sendWithStepUp('POST', '/api/admin/admin/users/u1/ban', new Headers(), async (h) => {
    sent.push(h.get('x-step-up-token'));
    return sent.length === 1 ? res(403, { code: 'INSUFFICIENT_PERMISSION', message: 'step_up_required' }) : res(200, { ok: true });
  });
  assert.equal(out.status, 200);
  assert.deepEqual(asked, ['POST:/api/v1/admin/users/u1/ban']);
  assert.deepEqual(sent, [null, 'tok-1']);
});

test('other 403s, a cancelled prompt and no prompt are not retried', async () => {
  let calls = 0;
  setStepUpPrompt(async () => 'tok');
  await sendWithStepUp('POST', '/api/admin/x', new Headers(), async () => { calls += 1; return res(403, { code: 'csrf_validation_failed' }); });
  assert.equal(calls, 1);
  calls = 0;
  setStepUpPrompt(async () => null);
  const out = await sendWithStepUp('POST', '/api/admin/x', new Headers(), async () => { calls += 1; return res(403, { message: 'step_up_required' }); });
  assert.equal(out.status, 403); assert.equal(calls, 1);
  setStepUpPrompt(null);
  calls = 0;
  await sendWithStepUp('POST', '/api/admin/x', new Headers(), async () => { calls += 1; return res(403, { message: 'step_up_required' }); });
  assert.equal(calls, 1);
});

test('the action matches the backend guard format', () => {
  assert.equal(stepUpActionFor('put', '/api/admin/admin/loyalty/config?x=1'), 'PUT:/api/v1/admin/loyalty/config');
  assert.equal(stepUpActionFor('POST', '/elsewhere'), null);
});

test('both admin fetch helpers (fetchWithAdminGuard, adminFetch) prompt and retry on a step-up 403', async () => {
  (globalThis as any).document = { cookie: 'admin_csrf=c1' };
  const { fetchWithAdminGuard } = await import('../../src/utils/api');
  const { adminFetch } = await import('../../src/lib/admin-client');
  for (const call of [
    () => fetchWithAdminGuard('/admin/admin/loyalty/config', { method: 'PUT', body: '{}' }),
    () => adminFetch('/api/admin/admin/impersonation/start', { method: 'POST', body: '{}' }),
  ]) {
    const seen: Array<string | null> = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      seen.push(new Headers(init.headers).get('x-step-up-token'));
      return seen.length === 1 ? res(403, { message: 'step_up_required' }) : res(200, { ok: true });
    }) as typeof fetch;
    setStepUpPrompt(async () => 'tok-2');
    await call();
    assert.deepEqual(seen, [null, 'tok-2']);
  }
  setStepUpPrompt(null);
});
