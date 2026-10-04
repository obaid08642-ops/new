/**
 * F60 — the payment webhook must never be trusted without its secret.
 *
 * Q86/Q104: the only receiver is PaymentsService.handleMoyasarWebhook
 * (POST /payments/webhook/moyasar). Moyasar authenticates with secret_token in
 * the body. A missing secret fails closed in every environment, and a rotated
 * secret refuses a replayed body.
 */
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from '../src/modules/payments/payments.module';

function makeService() {
  const svc: any = Object.create(PaymentsService.prototype);
  svc.txns = { findOne: jest.fn(async () => null) };
  svc.verifyPayment = jest.fn();
  return svc;
}

describe('F60 — the Moyasar webhook secret is required in every environment', () => {
  const BODY = { id: 'evt_1', type: 'payment_paid', created_at: '2026-10-04T00:00:00Z', secret_token: 'whsec_test', live: false, data: { id: 'pay_1' } };
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it('rejects a webhook when no secret is configured, even in development', async () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'development';
    await expect(makeService().handleMoyasarWebhook(BODY)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a webhook when no secret is configured in production', async () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    await expect(makeService().handleMoyasarWebhook(BODY)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a webhook with no secret_token even when a secret is set', async () => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_test';
    await expect(makeService().handleMoyasarWebhook({ ...BODY, secret_token: undefined })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts the configured secret_token', async () => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_test';
    await expect(makeService().handleMoyasarWebhook(BODY)).resolves.toEqual({ ok: false, reason: 'no_match' });
  });

  it('rejects a replayed body once the secret rotates', async () => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec_rotated';
    await expect(makeService().handleMoyasarWebhook(BODY)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
