// ACCEPTANCE — Q86 + Q104 + Q99 (REVIEW_REAUDIT Round 12 Phase A #3). Written by
// the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. One payment path (Moyasar, POST /payments/intent/:type/:id) and ONE
// Moyasar webhook receiver, POST /payments/webhook/moyasar, that authenticates
// Moyasar's `secret_token` (body) against MOYASAR_WEBHOOK_SECRET in every
// environment, staging included, and takes the payment status from the gateway.
// Q86 / Q99 / Q104: Moyasar's real webhook body was refused by the DTO (400
// before any check), the code expected an HMAC header Moyasar never sends
// (Moyasar authenticates with secret_token in the body), the event was looked
// up by the event id instead of the payment id, and two more receivers
// (/webhooks/moyasar fail-open outside production, /moyasar/webhook) wrote
// payment state on their own. One receiver remains: POST
// /payments/webhook/moyasar, authenticated by secret_token, fail-closed, and
// the payment status always comes from the gateway, never from the body.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PaymentsService, PaymentsWebhookController } from '../../src/modules/payments/payments.module';
import { MoyasarWebhookDto } from '../../src/modules/payments/payments.dto';
import { WebhooksController } from '../../src/modules/webhooks/webhooks.controller';

const REAL_BODY = {
  id: 'evt_7b2e0f3c-1111-4aaa-9bbb-000000000001',
  type: 'payment_paid',
  created_at: '2026-10-04T12:00:00.000Z',
  secret_token: 'whsec-synthetic-test-token',
  account_name: 'Nabd Plus',
  live: false,
  data: { id: 'pay_synthetic_1', status: 'paid', amount: 15000, currency: 'SAR', metadata: { booking_id: 'b1', kind: 'consultation' } },
};

describe('one Moyasar webhook receiver (Q86/Q99/Q104)', () => {
  let svc: any;
  let txns: any;
  const env = { ...process.env };
  beforeEach(() => {
    process.env.MOYASAR_WEBHOOK_SECRET = 'whsec-synthetic-test-token';
    txns = { findOne: jest.fn(async () => ({ id: 'tx1', patient_id: 'p1', gateway_intent_id: 'pay_synthetic_1' })) };
    svc = Object.create(PaymentsService.prototype);
    svc.txns = txns;
    svc.verifyPayment = jest.fn(async () => ({ status: 'paid' }));
  });
  afterEach(() => { process.env = { ...env }; });

  it('the real Moyasar body passes the strict DTO (whitelist + forbidNonWhitelisted)', async () => {
    const errors = await validate(plainToInstance(MoyasarWebhookDto, REAL_BODY), { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toEqual([]);
  });

  it('a valid secret_token reconciles the payment found by data.id with the gateway', async () => {
    await expect(svc.handleMoyasarWebhook(REAL_BODY)).resolves.toEqual({ ok: true });
    expect(JSON.stringify(txns.findOne.mock.calls[0][0])).toContain('pay_synthetic_1');
    expect(svc.verifyPayment).toHaveBeenCalledWith({ id: 'p1', role: 'system' }, 'tx1');
  });

  it('Q99: a wrong secret_token is refused on staging too (no environment skips the check)', async () => {
    process.env.NODE_ENV = 'staging';
    await expect(svc.handleMoyasarWebhook({ ...REAL_BODY, secret_token: 'forged' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(txns.findOne).not.toHaveBeenCalled();
  });

  it('a wrong or missing secret_token is refused before any lookup', async () => {
    await expect(svc.handleMoyasarWebhook({ ...REAL_BODY, secret_token: 'forged' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.handleMoyasarWebhook({ ...REAL_BODY, secret_token: undefined })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(txns.findOne).not.toHaveBeenCalled();
  });

  it('fails closed in every environment when the secret is not configured', async () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    for (const nodeEnv of ['development', 'staging', 'test', 'production']) {
      process.env.NODE_ENV = nodeEnv;
      await expect(svc.handleMoyasarWebhook(REAL_BODY)).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
    expect(txns.findOne).not.toHaveBeenCalled();
  });

  it('there is exactly one payment webhook route', () => {
    const webhookRoutes = Object.getOwnPropertyNames(WebhooksController.prototype)
      .filter((n) => n !== 'constructor' && Reflect.getMetadata('path', (WebhooksController.prototype as any)[n]) !== undefined)
      .map((n) => String(Reflect.getMetadata('path', (WebhooksController.prototype as any)[n])));
    expect(webhookRoutes).not.toContain('moyasar');
    expect(webhookRoutes).not.toContain('paytabs');
    const paymentsRoute = Reflect.getMetadata('path', (PaymentsWebhookController.prototype as any).webhook);
    expect(paymentsRoute).toBe('moyasar');
    expect(() => require('../../src/modules/moyasar/moyasar.module')).toThrow();
  });
});
