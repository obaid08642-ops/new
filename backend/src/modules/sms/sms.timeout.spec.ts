/**
 * 15.7 — timeouts + breakers on external calls (SMS leg).
 *
 * Proves with a mocked transport + fake timers that a hung SMS provider
 * fails fast into the existing `false` fallback (OTP flows fall back to
 * email + push) instead of hanging the request forever.
 */
import axios from 'axios';
import { SmsService } from './sms.service';

jest.mock('axios');
const mockedAxios = axios as unknown as { post: jest.Mock };

const enabledConn = (enabled: boolean) =>
  ({
    collection: () => ({ findOne: async () => ({ enabled }) }),
  }) as any;

describe('SmsService outbound timeout (15.7)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    process.env = { ...OLD_ENV, SMS_ENABLED: 'true', TAQNYAT_API_KEY: 'test-key', SMS_TIMEOUT_MS: '50' };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  it('fails fast with false when the provider hangs past the timeout', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(() => undefined)); // hangs forever
    const svc = new SmsService(enabledConn(true));

    const pending = svc.sendOtp('+966500000000', '123456');
    await jest.advanceTimersByTimeAsync(200); // well past SMS_TIMEOUT_MS=50
    await expect(pending).resolves.toBe(false);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    // axios itself also carries the timeout — belt and suspenders
    expect(mockedAxios.post.mock.calls[0][2]).toMatchObject({ timeout: 50 });
  });

  it('still delivers (true) when the provider answers in time', async () => {
    mockedAxios.post.mockResolvedValue({ status: 201 });
    const svc = new SmsService(enabledConn(true));

    const pending = svc.sendOtp('+966500000000', '123456');
    await jest.advanceTimersByTimeAsync(10);
    await expect(pending).resolves.toBe(true);
  });

  it('maps a provider error to the false fallback without throwing', async () => {
    mockedAxios.post.mockRejectedValue(Object.assign(new Error('socket hang up'), { code: 'ECONNABORTED' }));
    const svc = new SmsService(enabledConn(true));

    const pending = svc.sendOtp('+966500000000', '123456');
    await jest.advanceTimersByTimeAsync(10);
    await expect(pending).resolves.toBe(false);
  });

  it('does not call the transport at all when the channel is disabled', async () => {
    const svc = new SmsService(enabledConn(false));
    await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(false);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
