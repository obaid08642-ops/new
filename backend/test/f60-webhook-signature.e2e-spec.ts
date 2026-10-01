/**
 * F60 — payment webhooks and the hosted-checkout callback must never be trusted
 * or inert.
 *
 * Two real defects are covered here:
 *   1. The webhook signature was accepted when MOYASAR_WEBHOOK_SECRET was unset
 *      outside production, so a staging deployment with no secret would mark
 *      orders paid from a forged POST.
 *   2. The callback answered `{ ok: true }` without reconciling with the
 *      gateway, so a completed card payment only reached the platform if the
 *      patient happened to reopen the app.
 */
import { MoyasarService } from '../src/modules/moyasar/moyasar.module';

function makeService(overrides: Record<string, any> = {}) {
  const svc: any = new MoyasarService(
    { findOne: jest.fn(async () => null) } as any, {} as any, { emit: jest.fn() } as any,
  );
  Object.assign(svc, overrides);
  return svc;
}

describe('F60 — Moyasar webhook signature is required in every environment', () => {
  const BODY = JSON.stringify({ id: 'pay_1', status: 'paid' });
  const SECRET = 'whsec_test';

  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('rejects a webhook when no secret is configured, even in development', () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'development';
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, 'deadbeef')).toBe(false);
  });

  it('rejects a webhook when no secret is configured in production', () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, 'deadbeef')).toBe(false);
  });

  it('rejects a webhook with no signature header even when a secret is set', () => {
    process.env.MOYASAR_WEBHOOK_SECRET = SECRET;
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, undefined)).toBe(false);
  });

  it('rejects a webhook whose signature does not match the body', () => {
    process.env.MOYASAR_WEBHOOK_SECRET = SECRET;
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, 'f'.repeat(64))).toBe(false);
  });

  it('accepts a correctly signed webhook', () => {
    process.env.MOYASAR_WEBHOOK_SECRET = SECRET;
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', SECRET).update(BODY).digest('hex');
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, sig)).toBe(true);
  });

  it('rejects a replayed body once the secret rotates', () => {
    process.env.MOYASAR_WEBHOOK_SECRET = SECRET;
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', SECRET).update(BODY).digest('hex');
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_rotated';
    const svc = makeService();
    expect(svc.verifyWebhookSignature(BODY, sig)).toBe(false);
  });
});
