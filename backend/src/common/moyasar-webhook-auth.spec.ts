import * as crypto from 'crypto';
import { isMoyasarWebhookAuthenticated } from '../common/moyasar-webhook-auth';

/** D-28/S-5: the two documented proofs, and nothing else, authenticate a webhook. */
describe('isMoyasarWebhookAuthenticated', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, MOYASAR_WEBHOOK_SECRET: 'hook-secret' };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('accepts the body secret_token Moyasar documents', () => {
    expect(isMoyasarWebhookAuthenticated({ secret_token: 'hook-secret' }, undefined, '{}')).toBe(true);
  });

  it('refuses a missing or wrong body token', () => {
    expect(isMoyasarWebhookAuthenticated({}, undefined, '{}')).toBe(false);
    expect(isMoyasarWebhookAuthenticated({ secret_token: 'wrong' }, undefined, '{}')).toBe(false);
    expect(isMoyasarWebhookAuthenticated({ secret_token: '' }, undefined, '{}')).toBe(false);
  });

  it('still accepts the older HMAC header path', () => {
    const raw = '{"id":"pay_1"}';
    const sig = crypto.createHmac('sha256', 'hook-secret').update(raw).digest('hex');
    expect(isMoyasarWebhookAuthenticated({ id: 'pay_1' }, sig, raw)).toBe(true);
    expect(isMoyasarWebhookAuthenticated({ id: 'pay_1' }, `${sig}00`, raw)).toBe(false);
  });

  it('refuses everything when no secret is configured', () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    const raw = '{"id":"pay_1"}';
    expect(isMoyasarWebhookAuthenticated({ secret_token: 'anything' }, undefined, raw)).toBe(false);
    expect(isMoyasarWebhookAuthenticated({ id: 'pay_1' }, 'deadbeef', raw)).toBe(false);
  });
});
/** #551: the fuzzer found `POST /moyasar/webhook` with a signature header and no body answering 500. */
describe('isMoyasarWebhookAuthenticated: no body, odd signature', () => {
  const OLD_ENV = process.env;
  beforeEach(() => { process.env = { ...OLD_ENV, MOYASAR_WEBHOOK_SECRET: 'hook-secret' }; });
  afterAll(() => { process.env = OLD_ENV; });

  it('refuses, and never throws, when the raw body is missing', () => {
    expect(isMoyasarWebhookAuthenticated(undefined, 'HL_T:_a*{', undefined as unknown as string)).toBe(false);
    expect(isMoyasarWebhookAuthenticated({}, 'abc', undefined as unknown as string)).toBe(false);
    expect(isMoyasarWebhookAuthenticated(null, 'zz', null as unknown as string)).toBe(false);
  });

  it('a non-hex or odd-length signature is refused', () => {
    expect(isMoyasarWebhookAuthenticated({}, 'not-hex-at-all', '{}')).toBe(false);
    expect(isMoyasarWebhookAuthenticated({}, 'abc', '{}')).toBe(false);
  });
});
