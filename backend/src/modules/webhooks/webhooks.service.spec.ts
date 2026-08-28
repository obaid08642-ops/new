import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';

/** E5-F1 regression: webhook signature verification must be FAIL-CLOSED in production. */
describe('WebhooksService (E5-F1 hardening)', () => {
  const OLD_ENV = process.env;
  let svc: WebhooksService;
  let emit: jest.Mock;
  let redisStore: Map<string, string>;
  let recordEvidence: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    emit = jest.fn();
    recordEvidence = jest.fn().mockResolvedValue({ recorded: true, idempotent: true });
    redisStore = new Map();
    const redis: any = {
      setnx: jest.fn(async (k: string, v: string) => {
        if (redisStore.has(k)) return false;
        redisStore.set(k, v);
        return true;
      }),
      expire: jest.fn(async () => {}),
      exists: jest.fn(async (k: string) => redisStore.has(k)),
    };
    svc = new WebhooksService({ emit, emitAsync: jest.fn(async () => []) } as any, redis, { recordVerifiedGatewayPayment: recordEvidence } as any);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('rejects moyasar webhook when secret missing in production (fail-closed)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    await expect(svc.handleMoyasarWebhook({ event: 'payment.paid', data: {} }, 'sig', '{}'))
      .rejects.toThrow('Invalid signature');
    expect(emit).not.toHaveBeenCalled();
  });

  it('rejects moyasar webhook when signature header missing (production)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_WEBHOOK_SECRET = 's3cret';
    await expect(svc.handleMoyasarWebhook({ event: 'payment.paid', data: {} }, undefined, '{}'))
      .rejects.toThrow('Invalid signature');
  });

  it('accepts a correctly signed moyasar webhook (production)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_WEBHOOK_SECRET = 's3cret';
    const raw = JSON.stringify({ event: 'payment.paid', data: { id: 'pay_1' } });
    const sig = crypto.createHmac('sha256', 's3cret').update(raw).digest('hex');
    const res = await svc.handleMoyasarWebhook(raw ? JSON.parse(raw) : {}, sig, raw);
    expect(res.status).toBe('success');
    expect(recordEvidence).toHaveBeenCalledWith('moyasar', { id: 'pay_1' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('deduplicates a replayed moyasar event', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_WEBHOOK_SECRET = 's3cret';
    const raw = JSON.stringify({ event: 'payment.paid', data: { id: 'pay_1' } });
    const sig = crypto.createHmac('sha256', 's3cret').update(raw).digest('hex');
    await svc.handleMoyasarWebhook(JSON.parse(raw), sig, raw);
    const second = await svc.handleMoyasarWebhook(JSON.parse(raw), sig, raw);
    expect(second.deduplicated).toBe(true);
    expect(recordEvidence).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it('does not mark a payment replay when durable evidence write fails', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOYASAR_WEBHOOK_SECRET = 's3cret';
    recordEvidence.mockRejectedValueOnce(new Error('db unavailable'));
    const raw = JSON.stringify({ event: 'payment.paid', data: { id: 'pay_retry' } });
    const sig = crypto.createHmac('sha256', 's3cret').update(raw).digest('hex');
    await expect(svc.handleMoyasarWebhook(JSON.parse(raw), sig, raw)).rejects.toThrow('db unavailable');
    expect(redisStore.has('webhook_seen:moyasar:payment.paid:pay_retry')).toBe(false);
  });

  it('rejects paytabs webhook when signature invalid (production)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYTABS_SERVER_KEY = 'key';
    await expect(svc.handlePayTabsWebhook({ tran_ref: 'T1' }, 'bad-sig', '{"tran_ref":"T1"}'))
      .rejects.toThrow('Invalid signature');
  });

  it('accepts correctly signed paytabs webhook (production)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYTABS_SERVER_KEY = 'key';
    const raw = '{"tran_ref":"T1"}';
    const sig = crypto.createHmac('sha256', 'key').update(raw).digest('hex');
    const res = await svc.handlePayTabsWebhook({ tran_ref: 'T1' }, sig, raw);
    expect(res.status).toBe('success');
    expect(emit).not.toHaveBeenCalled();
  });

  it('rejects sms webhook when token not configured in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMS_WEBHOOK_TOKEN;
    await expect(svc.handleSmsWebhook({}, 'x')).rejects.toThrow();
  });

  it('rejects sms webhook with wrong token (timing-safe)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMS_WEBHOOK_TOKEN = 'expected';
    await expect(svc.handleSmsWebhook({}, 'wrong')).rejects.toThrow('Invalid token');
  });
});
