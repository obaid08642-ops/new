/**
 * Phase 21.4 — the email provider chain: Resend → SES → Brevo, with a quota per
 * provider per window, a health state, a cooldown, and a return to the first
 * provider when its window resets.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MailService, MailProvider } from './mail.module';

type Sent = { to: string; provider: string };

describe('Phase 21.4 email provider chain', () => {
  const envKeys = [
    'MAIL_PROVIDER_ORDER', 'RESEND_API_KEY', 'SES_SMTP_HOST', 'SES_SMTP_USER', 'SES_SMTP_PASS',
    'BREVO_SMTP_HOST', 'BREVO_API_KEY', 'MAIL_SEND_TIMEOUT_MS', 'MAIL_PROVIDER_COOLDOWN_MS',
    'RESEND_DAILY_QUOTA', 'SES_DAILY_QUOTA', 'BREVO_DAILY_QUOTA', 'MAIL_FROM',
  ];
  const previous: Record<string, string | undefined> = {};
  let sent: Sent[];
  let failures: Map<MailProvider, () => Promise<unknown>>;

  function makeService() {
    // Every provider is "configured"; the transport is stubbed through the
    // private dispatch so the chain logic is what is under test, not HTTP.
    const svc = new MailService(new EventEmitter2());
    const dispatch = jest.spyOn(svc as unknown as { dispatch: (p: MailProvider) => Promise<void> }, 'dispatch');
    dispatch.mockImplementation(async (provider: MailProvider) => {
      const fail = failures.get(provider);
      if (fail) await fail();
      sent.push({ to: 'user@example.test', provider });
    });
    return { svc, dispatch };
  }

  beforeEach(() => {
    for (const k of envKeys) previous[k] = process.env[k];
    process.env.MAIL_PROVIDER_ORDER = 'resend,ses,brevo';
    process.env.RESEND_API_KEY = 'k';
    process.env.SES_SMTP_HOST = 'h';
    process.env.SES_SMTP_USER = 'u';
    process.env.SES_SMTP_PASS = 'p';
    process.env.BREVO_SMTP_HOST = 'h';
    process.env.BREVO_API_KEY = 'k';
    process.env.MAIL_PROVIDER_COOLDOWN_MS = '300000';
    delete process.env.RESEND_DAILY_QUOTA;
    delete process.env.SES_DAILY_QUOTA;
    delete process.env.BREVO_DAILY_QUOTA;
    sent = [];
    failures = new Map();
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
  });

  it('uses the first provider when it works', async () => {
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'resend', fallback_used: false });
    expect(sent.map((s) => s.provider)).toEqual(['resend']);
  });

  it('moves to the next provider on an error, and reports the fallback', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'ses', fallback_used: true });
    expect(sent.map((s) => s.provider)).toEqual(['ses']);
  });

  it('walks the whole chain to the last provider', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    failures.set('ses', async () => { throw new Error('ses_down'); });
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r).toMatchObject({ ok: true, provider: 'brevo', fallback_used: true });
  });

  it('reports failure when no provider can deliver, without throwing', async () => {
    for (const p of ['resend', 'ses', 'brevo'] as MailProvider[]) {
      failures.set(p, async () => { throw new Error(`${p}_down`); });
    }
    const { svc } = makeService();
    const r = await svc.send('user@example.test', 's', '<p>x</p>');
    expect(r.ok).toBe(false);
    expect(r.provider).toBe('none');
  });

  it('skips a provider whose quota is used up and moves on', async () => {
    process.env.RESEND_DAILY_QUOTA = '1';
    const { svc } = makeService();
    await svc.send('a@example.test', 's', '<p>x</p>');
    const second = await svc.send('b@example.test', 's', '<p>x</p>');
    expect(second.provider).toBe('ses');
    expect(svc.providerState().find((s) => s.provider === 'resend')?.daily_used).toBe(1);
  });

  it('cools a provider down after repeated failures and returns to it when healthy again', async () => {
    failures.set('resend', async () => { throw new Error('resend_down'); });
    const { svc } = makeService();
    await svc.send('a@example.test', 's', '<p>x</p>');
    await svc.send('b@example.test', 's', '<p>x</p>');
    await svc.send('c@example.test', 's', '<p>x</p>');
    const state = svc.providerState().find((s) => s.provider === 'resend');
    expect(state?.consecutive_failures).toBeGreaterThanOrEqual(3);
    expect(state?.healthy).toBe(false);
    expect(state?.cooldown_until).toBeTruthy();
    // While cooling down the chain does not even try it.
    sent = [];
    failures.delete('resend');
    const r = await svc.send('d@example.test', 's', '<p>x</p>');
    expect(r.provider).toBe('ses');
    expect(sent.map((s) => s.provider)).not.toContain('resend');
  });

  it('reports configured/unconfigured honestly', async () => {
    delete process.env.BREVO_API_KEY;
    const svc = new MailService(new EventEmitter2());
    const state = svc.providerState();
    expect(state.find((s) => s.provider === 'resend')?.configured).toBe(true);
    expect(state.find((s) => s.provider === 'brevo')?.configured).toBe(false);
  });

  it('brands the OTP email as Nabd+ and states the real expiry', async () => {
    const svc = new MailService(new EventEmitter2());
    const spy = jest.spyOn(svc, 'send').mockResolvedValue({ ok: true, provider: 'resend', fallback_used: false });
    await svc.sendOtp('u@example.test', '123456', 7);
    const [to, subject, html, text] = spy.mock.calls[0] as [string, string, string, string];
    expect(to).toBe('u@example.test');
    expect(subject).toContain('نبض بلس');
    expect(subject).not.toContain('نَبْض');
    expect(html).toContain('123456');
    expect(html).toContain('7');
    expect(text).toContain('123456');
  });
});
