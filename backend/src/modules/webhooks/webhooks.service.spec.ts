import { WebhooksService } from './webhooks.service';

/**
 * E5-F1 regression: webhook token checks fail closed in production.
 * Q104: the Moyasar and PayTabs receivers that used to live here are gone; the
 * only payment webhook is POST /payments/webhook/moyasar (moyasar-webhook.q86.spec).
 */
describe('WebhooksService (E5-F1 hardening)', () => {
  const OLD_ENV = process.env;
  let svc: WebhooksService;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    svc = new WebhooksService({ emit: jest.fn(), emitAsync: jest.fn(async () => []) } as any);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('has no payment receivers', () => {
    expect((svc as any).handleMoyasarWebhook).toBeUndefined();
    expect((svc as any).handlePayTabsWebhook).toBeUndefined();
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
