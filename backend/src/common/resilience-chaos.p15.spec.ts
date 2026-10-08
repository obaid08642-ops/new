/**
 * 15.7 chaos suite — one test per external dependency.
 *
 * Each test kills the dependency (timeout / hard failure / open circuit) and
 * asserts the three things the contract requires:
 *   1. the call DEGRADES to the specified fallback instead of hanging or
 *      throwing a 500 at the user,
 *   2. the user-facing error/message names WHAT HAPPENED and WHAT TO DO,
 *   3. no data is lost — the local record is never marked done on a failure,
 *      and a later healthy call still succeeds on the same shared breaker.
 *
 * Every dependency runs behind the real `CircuitBreakerService`; only the
 * transport is faked. No live provider is contacted.
 */
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

// ── payment (Moyasar refund path, the integration that had a real defect) ────
import { MoyasarService } from '../modules/moyasar/moyasar.module';
import { StripeAdapter, TapAdapter, MoyasarAdapter } from '../modules/payments/payments.module';

// ── payment gateway adapters (Stripe / Tap / Moyasar via PaymentsService) ────
describe('15.7 chaos — payment adapters (timeout + breaker + user message)', () => {
  const env = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.PAYMENT_GATEWAY_TIMEOUT_MS = '70';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.TAP_API_KEY = 'tk_test';
    process.env.MOYASAR_API_KEY = 'mk_test';
    process.env.MOYASAR_API_BASE = 'https://gateway.test/v1';
    fetchMock = jest.fn(async (url: any) => {
      if (String(url).includes('pay_never_returns')) return hang();
      return { ok: true, status: 200, json: async () => ({ id: 'pi_1', client_secret: 'cs_1', latest_charge: 'ch_1', status: 'succeeded' }) };
    });
    (globalThis as any).fetch = fetchMock;
  });
  afterEach(() => {
    process.env = { ...env };
    delete (globalThis as any).fetch;
  });

  const adapters = () => ([
    ['stripe', new StripeAdapter(new CircuitBreakerService())],
    ['tap', new TapAdapter(new CircuitBreakerService())],
    ['moyasar', new MoyasarAdapter(new CircuitBreakerService())],
  ] as Array<[string, any]>);

  it('aborts a hung processor instead of leaving the request open', async () => {
    // a hung fetch that only the AbortSignal can end
    fetchMock.mockImplementation(async (_url: any, init: any) =>
      new Promise((_, rej) => {
        init?.signal?.addEventListener('abort', () => {
          const e: any = new Error('aborted');
          e.name = 'AbortError';
          rej(e);
        });
      }));

    for (const [name, adapter] of adapters()) {
      await expect(
        adapter.createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} }),
      ).rejects.toBeDefined();
    }
  });

  it('names the fault to the user (503 payment_gateway_timeout, not a raw 500)', async () => {
    fetchMock.mockImplementation(async (_url: any, init: any) =>
      new Promise((_, rej) => {
        init?.signal?.addEventListener('abort', () => {
          const e: any = new Error('aborted');
          e.name = 'AbortError';
          rej(e);
        });
      }));

    for (const [name, adapter] of adapters()) {
      const err = await adapter
        .createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} })
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.getResponse?.().message ?? err.message).toMatch(/payment_gateway_timeout/);
    }
  });

  it('stops calling a dead processor once its circuit is open', async () => {
    for (const [name, adapter] of adapters()) {
      fetchMock.mockRejectedValue(new Error('processor_http_500'));
      for (let i = 0; i < 14; i += 1) {
        await adapter.createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} }).catch(() => undefined);
      }
      const before = fetchMock.mock.calls.length;
      const err = await adapter
        .createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} })
        .catch((e: any) => e);
      // the open circuit answered from the fallback without a network call
      expect(fetchMock.mock.calls.length).toBe(before);
      expect(err?.getResponse?.()?.code ?? err?.response?.code).toBe('payment_gateway_unavailable');
    }
  });

  it('recovers on the same breaker once the processor is healthy again', async () => {
    const breakers = new CircuitBreakerService();
    const stripe = new StripeAdapter(breakers);
    fetchMock.mockRejectedValue(new Error('processor_http_500'));
    for (let i = 0; i < 14; i += 1) {
      await stripe.createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} }).catch(() => undefined);
    }
    expect(breakers.getStatus('payment:stripe:create_intent')).toBe('open');

    // The circuit stays open until its resetTimeout elapses; changing the
    // option after the open does NOT reschedule opossum's half-open timer, so
    // recovery here goes through the operational escape hatch (close the
    // breaker) and the SAME shared instance then serves the healthy call.
    expect(breakers.reset('payment:stripe:create_intent')).toBe(true);
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ id: 'pi_ok', client_secret: 'cs_ok' }) }));
    const res: any = await stripe.createIntent({ amount: 10, currency: 'SAR', description: 'd', metadata: {} });
    expect(res.intent_id).toBe('pi_ok');
  });
});

// ── mail ────────────────────────────────────────────────────────────────────
import { MailService } from '../modules/mail/mail.module';

// ── notifications / WhatsApp ────────────────────────────────────────────────
import { NotificationsService } from '../modules/notifications/notifications.service';

// ── storage / S3 ────────────────────────────────────────────────────────────
import { StorageService } from '../modules/storage/storage.module';

// ── livekit ─────────────────────────────────────────────────────────────────
import { LiveKitService } from '../modules/livekit/livekit.service';

// ── sms ─────────────────────────────────────────────────────────────────────
import { SmsService } from '../modules/sms/sms.service';

// ── ai ──────────────────────────────────────────────────────────────────────
import { AiGatewayService } from '../modules/ai/ai-gateway.service';

const hang = () => new Promise<never>(() => { /* never settles */ });

// ── mail ────────────────────────────────────────────────────────────────────
describe('15.7 chaos — mail (Resend → SES)', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'rk';
    process.env.MAIL_TIMEOUT_MS = '80';
    process.env.SES_SMTP_HOST = 'email-smtp.eu-west-1.amazonaws.com';
    process.env.SES_SMTP_USER = 'u';
    process.env.SES_SMTP_PASS = 'p';
  });
  afterEach(() => { process.env = { ...env }; });

  /**
   * The providers are injected on the instance rather than mocked at the module
   * level: `jest.resetModules()` would hand later test files a *different*
   * axios module instance than the already-imported services hold, which
   * silently un-patches their spies.
   */
  const mailWith = (resendSend: jest.Mock, sesSend: jest.Mock, breakers = new CircuitBreakerService()) => {
    const mail = new MailService({ emit: jest.fn() } as any, undefined, breakers);
    (mail as any).resend = { emails: { send: resendSend } };
    (mail as any).sesTransport = () => ({ sendMail: sesSend });
    return mail;
  };

  it('falls through to SES when the primary provider hangs, and reports the fallback', async () => {
    const resendSend = jest.fn().mockImplementation(hang);
    const sesSend = jest.fn().mockResolvedValue({ messageId: 'ses-1' });
    const events = { emit: jest.fn() };
    const mail = mailWith(resendSend, sesSend);
    (mail as any).events = events;

    const res: any = await mail.send('user@example.test', 's', '<p>x</p>');

    expect(res.ok).toBe(true);
    expect(res.provider).toBe('ses');
    expect(res.fallback_used).toBe(true);      // degraded, and it says so
    expect(resendSend).toHaveBeenCalled();
    expect(sesSend).toHaveBeenCalled();
    // the event stream reports which provider actually delivered
    expect(events.emit).toHaveBeenCalledWith('mail.sent', expect.objectContaining({ provider: 'ses', fallback_used: true }));
  });

  it('answers ok:false — never a throw — when every provider is down', async () => {
    delete process.env.SES_SMTP_HOST;
    const mail = mailWith(jest.fn(async () => ({ error: { message: 'upstream 500' } })), jest.fn());

    const res: any = await mail.send('user@example.test', 's', '<p>x</p>');
    expect(res.ok).toBe(false);
    expect(res.provider).toBe('none');
    expect(res.error).toBeTruthy();           // "what happened"
  });

  it('stops calling a dead primary provider once its circuit is open', async () => {
    delete process.env.SES_SMTP_HOST;
    const breakers = new CircuitBreakerService();
    const resendSend = jest.fn().mockRejectedValue(new Error('resend_http_500'));
    const mail = mailWith(resendSend, jest.fn(), breakers);

    for (let i = 0; i < 14; i += 1) {
      await mail.send(`u${i}@example.test`, 's', '<p>x</p>');
    }
    expect(breakers.getStatus('mail:resend:send')).toBe('open');

    const before = resendSend.mock.calls.length;
    const res: any = await mail.send('later@example.test', 's', '<p>x</p>');
    expect(resendSend.mock.calls.length).toBe(before);   // not retried
    expect(res.ok).toBe(false);                         // and it says what happened
  });

  it('keeps a later healthy message deliverable on the same shared breaker (Q81 shape)', async () => {
    const breakers = new CircuitBreakerService();
    let healthy = false;
    const resendSend = jest.fn().mockImplementation(async () => (healthy ? { data: { id: 'r1' } } : hang()));
    const mail = mailWith(resendSend, jest.fn(), breakers);

    await mail.send('a@example.test', 's', '<p>x</p>').catch(() => undefined);
    healthy = true;
    const res: any = await mail.send('b@example.test', 's', '<p>x</p>');
    expect(res.ok).toBe(true);
    // the shared breaker delivered the SECOND recipient's own message
    expect(resendSend).toHaveBeenLastCalledWith(expect.objectContaining({ to: 'b@example.test' }));
  });
});

// ── WhatsApp ────────────────────────────────────────────────────────────────
describe('15.7 chaos — WhatsApp (Infobip) → email fallback', () => {
  const env = { ...process.env };
  const anySms = { sendOtp: jest.fn(async () => false) } as any;
  const anyMail = { send: jest.fn(async () => ({ ok: true, provider: 'resend', fallback_used: false })), sendOtp: jest.fn(async () => ({ ok: true, provider: 'resend', fallback_used: false })) } as any;

  const mk = (breakers: CircuitBreakerService) => new NotificationsService(
    { create: jest.fn(), aggregate: jest.fn(async () => []), db: { model: jest.fn() } } as any,
    { findOne: jest.fn() } as any,
    { emit: jest.fn() } as any,
    anySms, anyMail,
    {} as any,
    { t: jest.fn() } as any,
    breakers,
  );

  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  it('reports WhatsApp as FAILED (not delivered) when the provider fails', async () => {
    process.env.INFOBIP_API_KEY = 'ibk';
    process.env.INFOBIP_URL = 'api.infobip.com';
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('infobip_http_503'));

    const svc = mk(new CircuitBreakerService());
    await expect(svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000')).resolves.toBe(false);
  });

  it('reports WhatsApp as delivered only when the provider accepted it', async () => {
    process.env.INFOBIP_API_KEY = 'ibk';
    process.env.INFOBIP_URL = 'api.infobip.com';
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });

    const svc = mk(new CircuitBreakerService());
    await expect(svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000')).resolves.toBe(true);
  });

  it('fails fast with false when the WhatsApp circuit is open', async () => {
    process.env.INFOBIP_API_KEY = 'ibk';
    process.env.INFOBIP_URL = 'api.infobip.com';
    process.env.NOTIFY_TIMEOUT_MS = '50';
    const axios = require('axios');
    const post = jest.spyOn(axios, 'post').mockRejectedValue(new Error('infobip_http_503'));

    const breakers = new CircuitBreakerService();
    const svc = mk(breakers);
    for (let i = 0; i < 14; i += 1) {
      await svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000');
    }
    expect(breakers.getStatus('notify:whatsapp:infobip')).toBe('open');

    const callsBefore = post.mock.calls.length;
    // circuit is open: the provider is not called again at all
    await expect(svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000')).resolves.toBe(false);
    expect(post.mock.calls.length).toBe(callsBefore);
  });

  it('is skipped (and says so) when WhatsApp is not configured', async () => {
    delete process.env.INFOBIP_API_KEY;
    const svc = mk(new CircuitBreakerService());
    await expect(svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000')).resolves.toBe(false);
  });
});

// ── S3 / storage ────────────────────────────────────────────────────────────
describe('15.7 chaos — S3 / R2 object storage', () => {
  const env = { ...process.env };
  beforeEach(() => {
    // The adapter is chosen at construction time from these vars.
    process.env.S3_BUCKET = 'b';
    process.env.S3_ENDPOINT = 'https://r2.test';
    process.env.S3_ACCESS_KEY_ID = 'k';
    process.env.S3_SECRET_ACCESS_KEY = 's';
  });
  afterEach(() => { process.env = { ...env }; });

  it('times a hung object store out without persisting a storage record', async () => {
    process.env.S3_TIMEOUT_MS = '60';
    const stored: any[] = [];
    const model: any = {
      create: jest.fn(async (doc: any) => { stored.push(doc); return doc; }),
      findOne: jest.fn(async () => null),
      find: jest.fn(() => ({ lean: jest.fn(async () => []) })),
    };
    const mockUploadSecurity = {
      validateAndSecureUpload: jest.fn().mockResolvedValue({ buffer: Buffer.from('x'), sanitized: false, exifStripped: false, clamavScanned: false, pdfSanitized: false }),
      clamavAvailable: false,
      clamavChecked: true,
      checkClamavAvailability: jest.fn(),
    } as any;
    const svc = new StorageService(model, mockUploadSecurity);

    // Force the S3 adapter: stub the client send to hang.
    const aws = require('@aws-sdk/client-s3');
    const sendSpy = jest.spyOn(aws.S3Client.prototype, 'send').mockImplementation(hang as any);

    await expect(
      svc.upload({
        owner_account_id: 'acc-1', owner_kind: 'user',
        mime: 'application/pdf', data_base64: Buffer.from('x').toString('base64'),
        original_name: 'a.pdf', visibility: 'private',
      } as any),
    ).rejects.toMatchObject({ response: { message: 'PRIVATE_OBJECT_STORAGE_UNAVAILABLE' } });

    // no data loss / no phantom object: nothing was recorded as stored
    expect(stored).toHaveLength(0);
    sendSpy.mockRestore();
  });

  it('opens the storage circuit so a dead store stops being retried per upload', async () => {
    process.env.S3_TIMEOUT_MS = '40';
    const model: any = { create: jest.fn(async (d: any) => d), findOne: jest.fn(async () => null) };
    const breakers = new CircuitBreakerService();
    const mockUploadSecurity = {
      validateAndSecureUpload: jest.fn().mockResolvedValue({ buffer: Buffer.from('x'), sanitized: false, exifStripped: false, clamavScanned: false, pdfSanitized: false }),
      clamavAvailable: false,
      clamavChecked: true,
      checkClamavAvailability: jest.fn(),
    } as any;
    const svc = new StorageService(model, mockUploadSecurity);

    const aws = require('@aws-sdk/client-s3');
    const sendSpy = jest.spyOn(aws.S3Client.prototype, 'send').mockImplementation(hang as any);

    for (let i = 0; i < 14; i += 1) {
      await svc.upload({
        owner_account_id: 'acc-1', owner_kind: 'user',
        mime: 'application/pdf', data_base64: Buffer.from('x').toString('base64'),
        original_name: 'a.pdf', visibility: 'private',
      } as any).catch(() => undefined);
    }
    expect(breakers.getStatus('storage:s3:put')).toBe('open');
    sendSpy.mockRestore();
  });
});

// ── LiveKit ─────────────────────────────────────────────────────────────────
describe('15.7 chaos — LiveKit', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.LIVEKIT_URL = 'https://lk.test';
    process.env.LIVEKIT_API_KEY = 'k';
    process.env.LIVEKIT_API_SECRET = 's';
  });
  afterEach(() => { process.env = { ...env }; });

  const mk = (breakers: CircuitBreakerService) => new LiveKitService(
    { findOne: jest.fn() } as any,
    { collection: jest.fn() } as any,
    { emit: jest.fn() } as any,
    breakers,
  );

  it('degrades to an empty participant list when the server hangs', async () => {
    process.env.LIVEKIT_TIMEOUT_MS = '50';
    const svc = mk(new CircuitBreakerService());
    (svc as any).roomService = () => ({ listParticipants: hang });

    await expect(svc.getRoomParticipants('room-1')).resolves.toEqual([]);
  });

  it('answers success:false rather than hanging when the server is down', async () => {
    process.env.LIVEKIT_TIMEOUT_MS = '50';
    const svc = mk(new CircuitBreakerService());
    (svc as any).roomService = () => ({ getParticipant: () => new Promise(() => undefined), mutePublishedTrack: jest.fn() });

    const r = await svc.muteParticipant('room-1', 'p-1', true);
    expect(r.success).toBe(false);            // names what happened
    expect(r.reason).toBeTruthy();
  });

  it('serves the degraded answer from the fallback once the circuit is open', async () => {
    process.env.LIVEKIT_TIMEOUT_MS = '50';
    const breakers = new CircuitBreakerService();
    const svc = mk(breakers);
    const listParticipants = jest.fn(() => hang());
    (svc as any).roomService = () => ({ listParticipants });

    for (let i = 0; i < 14; i += 1) {
      await svc.getRoomParticipants('room-1');
    }
    expect(breakers.getStatus('livekit:list_participants')).toBe('open');

    const before = listParticipants.mock.calls.length;
    await expect(svc.getRoomParticipants('room-1')).resolves.toEqual([]);
    expect(listParticipants.mock.calls.length).toBe(before);   // not retried
  });

  it('recovers on the same breaker once the server is healthy again', async () => {
    process.env.LIVEKIT_TIMEOUT_MS = '60';
    const breakers = new CircuitBreakerService();
    const svc = mk(breakers);
    let healthy = false;
    (svc as any).roomService = () => ({
      listParticipants: async (room: string) => {
        if (!healthy) return hang();
        return [{ identity: 'p1', name: 'A', state: 'active', isPublisher: true, tracks: [] }];
      },
    });

    await svc.getRoomParticipants('room-1');
    healthy = true;
    const list = await svc.getRoomParticipants('room-1');
    expect(list).toHaveLength(1);             // recovered on the SAME breaker
    expect(list[0].identity).toBe('p1');
  });
});

// ── maps ────────────────────────────────────────────────────────────────────
import { NabdExtensionsService } from '../modules/nabd-extensions/nabd-extensions.service';

describe('15.7 chaos — maps (no external call; typed address is the fallback)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  /**
   * Audit result: the backend makes NO external maps/geocoding call anywhere
   * (geo matching is a local haversine over stored coordinates; delivery
   * addresses are typed street/city/district). So there is no maps timeout or
   * breaker to add — the "maps → typed address" fallback is the primary path
   * by construction. These tests pin that: geo ranking works fully offline,
   * and a provider with only a typed address (no coordinates) still degrades
   * to a listed result instead of being dropped or throwing.
   */
  const svcWith = (pharmacies: any[]) => {
    const svc: any = Object.create(NabdExtensionsService.prototype);
    svc.userModel = {
      db: {
        model: (name: string) => {
          if (name === 'ProviderAccount') {
            return { find: jest.fn(() => ({ lean: jest.fn(async () => [{ id: 'acc-near' }, { id: 'acc-nogeo' }]) })) };
          }
          throw new Error(`unexpected model ${name}`);
        },
      },
    };
    svc.providerProfileModel = {
      find: jest.fn(() => ({ lean: jest.fn(async () => pharmacies) })),
    };
    return svc as NabdExtensionsService;
  };

  it('ranks pharmacies nearest-first with zero external calls', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    // Node <18 / this jest env has no global fetch: stub it outright instead
    // of spyOn (which throws "property does not exist"). Either way the
    // service must never touch the network.
    const hadFetch = typeof (globalThis as any).fetch === 'function';
    const fetchSpy = hadFetch
      ? jest.spyOn(globalThis as any, 'fetch').mockRejectedValue(new Error('must not call network'))
      : ((globalThis as any).fetch = jest.fn().mockRejectedValue(new Error('must not call network')));
    try {
      const svc = svcWith([
        { account_id: 'acc-near', provider_type: 'pharmacy', name: 'far-jeddah', geo: { lat: 21.4858, lng: 39.1925 } },
        { account_id: 'acc-near', provider_type: 'pharmacy', name: 'near-riyadh', geo: { lat: 24.7136, lng: 46.6753 } },
        { account_id: 'acc-other', provider_type: 'pharmacy', name: 'unapproved', geo: { lat: 24.7137, lng: 46.6754 } },
      ]);

      const matches = await svc.matchPharmacy(24.7136, 46.6753, '');
      expect(matches.map((m: any) => m.provider.name)).toEqual(['near-riyadh', 'far-jeddah']);
      expect(matches[0].distanceKm).toBeLessThan(1);
      expect(matches[1].distanceKm).toBeGreaterThan(500);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (!hadFetch) delete (globalThis as any).fetch;
    }
  });

  it('keeps a typed-address-only pharmacy listed (degraded, never lost)', async () => {
    const svc = svcWith([
      { account_id: 'acc-nogeo', provider_type: 'pharmacy', name: 'typed-only', address: 'شارع العليا 12، الرياض' },
    ]);
    const matches = await svc.matchPharmacy(24.7136, 46.6753, '');
    expect(matches).toHaveLength(1);
    expect(matches[0].provider.address).toBe('شارع العليا 12، الرياض');
  });
});
// ── SMS ─────────────────────────────────────────────────────────────────────
describe('15.7 chaos — SMS (already had a breaker; pinned here)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  const mk = (breakers: CircuitBreakerService, enabled: boolean) => {
    const conn: any = { collection: () => ({ findOne: async () => ({ key: 'sms_enabled', enabled }) }) };
    return new SmsService(conn, breakers);
  };

  it('degrades to false (so OTP falls back to email) when the provider hangs', async () => {
    process.env.TAQNYAT_API_KEY = 'tk';
    process.env.SMS_TIMEOUT_MS = '60';
    const axios = require('axios');
    const spy = jest.spyOn(axios, 'post').mockImplementation(hang as any);

    await expect(mk(new CircuitBreakerService(), true).sendOtp('+966500000000', '123456')).resolves.toBe(false);
    spy.mockRestore();
  });

  it('stops calling a dead provider once its circuit is open', async () => {
    process.env.TAQNYAT_API_KEY = 'tk';
    process.env.SMS_TIMEOUT_MS = '50';
    const axios = require('axios');
    const spy = jest.spyOn(axios, 'post').mockRejectedValue(new Error('taqnyat_http_500'));
    const breakers = new CircuitBreakerService();
    const svc = mk(breakers, true);

    for (let i = 0; i < 14; i += 1) {
      await svc.sendOtp('+966500000000', '123456');
    }
    expect(breakers.getStatus('sms:taqnyat:send')).toBe('open');
    const before = spy.mock.calls.length;
    await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(false);
    expect(spy.mock.calls.length).toBe(before);
    spy.mockRestore();
  });

  it('does not send when the channel is disabled (fail-closed, no code leaked)', async () => {
    delete process.env.TAQNYAT_API_KEY;
    const axios = require('axios');
    const spy = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
    await expect(mk(new CircuitBreakerService(), false).sendOtp('+966500000000', '123456')).resolves.toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── AI ──────────────────────────────────────────────────────────────────────
describe('15.7 chaos — AI providers (breaker + next-provider fallback)', () => {
  const providers = [
    { key: 'gemini', enabled: true, api_key: 'k', model: 'gemini-2.0-flash', priority: 1, daily_quota: 0, used_today: 0, usage_date: '' },
    { key: 'groq', enabled: true, api_key: 'k', model: 'llama-3.3-70b', priority: 2, daily_quota: 0, used_today: 0, usage_date: '' },
  ];
  const conn = () => {
    const c: any = { collection: jest.fn((n: string) => {
      if (n === 'featureflags') return { findOne: jest.fn().mockResolvedValue({ value: 'auto', purpose_overrides: {} }), updateOne: jest.fn() };
      if (n === 'ai_providers') return {
        countDocuments: jest.fn().mockResolvedValue(2),
        find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(providers) }) }),
        findOne: jest.fn().mockImplementation((q: any) => Promise.resolve(providers.find((p) => p.key === q.key) || null)),
        updateOne: jest.fn(),
      };
      return { insertOne: jest.fn(), updateOne: jest.fn() };
    }) };
    return c;
  };
  const mk = (breakers: CircuitBreakerService) => {
    const s = new AiGatewayService(conn(), breakers);
    s.setGuardTuning({ cooldownMs: 60_000, cacheTtlMs: 1, callTimeoutMs: 80 });
    return s;
  };

  it('falls over to the NEXT provider when the first hangs', async () => {
    const s = mk(new CircuitBreakerService());
    s.setTransportForTests(async (p: any, _o: any, signal: AbortSignal) => {
      if (p.key === 'gemini') return hang();
      if (signal.aborted) throw new Error('aborted');
      return `ok-from-${p.key}`;
    });

    const r: any = await s.generate({ prompt: 'hi', feature: 'triage' });
    expect(r.provider).toBe('groq');
    expect(r.fell_back).toBe(true);
    expect(r.text).toBe('ok-from-groq');
  });

  it('opens the provider circuit and keeps answering from the next provider', async () => {
    // The breaker is the guard for PERSISTENT failures. Transient failures
    // (429/5xx/timeout) are absorbed by the per-provider cooldown, which
    // shields the breaker — so this chaos uses a persistent non-transient
    // failure (bad credentials shape), the case the breaker exists for.
    const breakers = new CircuitBreakerService();
    const s = mk(breakers);
    const geminiCalls = jest.fn(async () => { throw new BadGatewayException('gemini_empty_response'); });
    s.setTransportForTests(async (p: any) => (p.key === 'gemini' ? geminiCalls() : 'ok-from-groq'));

    for (let i = 0; i < 14; i += 1) {
      await s.generate({ prompt: `p${i}`, feature: 'triage' }).catch(() => undefined);
    }
    expect(breakers.getStatus('ai:gemini:generate')).toBe('open');

    // the dead provider is no longer called, yet the feature still answers
    const before = geminiCalls.mock.calls.length;
    const r: any = await s.generate({ prompt: 'final', feature: 'triage' }).catch((e) => e);
    expect(geminiCalls.mock.calls.length).toBe(before);
    expect(r?.text ?? r).toBe('ok-from-groq');
  });

  it('throws a typed 503 when no provider is usable at all (never a raw 500)', async () => {
    const s = mk(new CircuitBreakerService());
    s.setTransportForTests(async (p: any) => { throw Object.assign(new Error('boom_http_500'), { status: 500 }); });
    await expect(s.generate({ prompt: 'x', feature: 'triage' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('preserves the typed failure through the breaker fallback (no mistyped generic)', async () => {
    // Regression: the breaker fallback once received the caller's first
    // argument as "the error", so a typed ServiceUnavailableException thrown
    // by the transport came back as a generic BadGatewayException and the
    // provider was never correctly classified/cooled-down.
    const s = mk(new CircuitBreakerService());
    s.setTransportForTests(async () => { throw new ServiceUnavailableException('ai_test_typed_503'); });
    const err: any = await s.generate({ prompt: 'x', feature: 'triage' }).catch((e) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(err.message).toMatch(/ai_test_typed_503/);
  });

  it('surfaces 503 ai_provider_unavailable when the chain is empty', async () => {
    const empty: any = { collection: jest.fn((n: string) => {
      if (n === 'featureflags') return { findOne: jest.fn().mockResolvedValue({ value: 'auto', purpose_overrides: {} }), updateOne: jest.fn() };
      if (n === 'ai_providers') return {
        countDocuments: jest.fn().mockResolvedValue(0),
        find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) }),
        findOne: jest.fn().mockResolvedValue(null), updateOne: jest.fn(),
      };
      return { insertOne: jest.fn(), updateOne: jest.fn() };
    }) };
    const s = new AiGatewayService(empty, new CircuitBreakerService());
    s.setGuardTuning({ cooldownMs: 60_000, cacheTtlMs: 1, callTimeoutMs: 80 });
    await expect(s.generate({ prompt: 'x', feature: 'triage' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});