import { applyOtpInput, currentConsents, forgotPassword, isValidIdentifier, normalizeIdentifier, registerPatient, requestOtp, resetPassword, verifyOtp } from '../src/auth/patientAuth';

const calls: { endpoint: string; body: any; skipAuth?: boolean }[] = [];
const apiWith = (answers: Record<string, unknown>) => jest.fn(async (endpoint: string, o?: { body?: string; skipAuth?: boolean }) => {
  calls.push({ endpoint, body: o?.body ? JSON.parse(o.body) : undefined, skipAuth: o?.skipAuth });
  const a = answers[endpoint];
  if (a instanceof Error) throw a;
  return a;
});
beforeEach(() => { calls.length = 0; });

test('identifiers: e-mail lower-cased, phone gets +966 once', () => {
  expect(normalizeIdentifier(' A@B.co ')).toBe('a@b.co');
  expect(normalizeIdentifier('0501234567')).toBe('+966501234567');
  expect(normalizeIdentifier('+971 50 123 4567')).toBe('+971501234567');
  expect(isValidIdentifier('a@b.co')).toBe(true);
  expect(isValidIdentifier('12')).toBe(false);
});

test('consents: current versions of the two required policies, v1 when none configured, null when unusable', async () => {
  const pol = [{ key: 'patient_terms', version: 'v3' }, { key: 'privacy_policy', version: 'v2' }, { key: 'x', version: '1' }];
  expect(await currentConsents(apiWith({ '/legal/policies': pol }))).toEqual([{ policy_id: 'patient_terms', version: 'v3' }, { policy_id: 'privacy_policy', version: 'v2' }]);
  expect(await currentConsents(apiWith({ '/legal/policies': [] }))).toEqual([{ policy_id: 'patient_terms', version: 'v1' }, { policy_id: 'privacy_policy', version: 'v1' }]);
  expect(await currentConsents(apiWith({ '/legal/policies': [{ key: 'x', version: '1' }] }))).toBeNull();
});

test('verifyOtp trades the exchange token for the pair, keeping the guest bearer', async () => {
  const api = apiWith({ '/auth/otp/verify': { exchange_token: 'ex' }, '/auth/session/exchange-native': { access_token: 'a', refresh_token: 'r' } });
  expect(await verifyOtp(api, '0501234567', '123456')).toEqual({ accessToken: 'a', refreshToken: 'r' });
  expect(calls[0]).toMatchObject({ endpoint: '/auth/otp/verify', body: { identifier: '+966501234567', code: '123456' } });
  expect(calls[1]).toMatchObject({ endpoint: '/auth/session/exchange-native', body: { exchange_token: 'ex' }, skipAuth: false });
});

test('verifyOtp without an exchange token fails', async () => {
  await expect(verifyOtp(apiWith({ '/auth/otp/verify': {} }), 'a@b.co', '1')).rejects.toThrow('otp_invalid');
});

test('register sends name, identifier, locale and the consents; refuses when no usable policy', async () => {
  const api = apiWith({ '/legal/policies': [], '/auth/register': { registered: true, otp_sent: true } });
  expect(await registerPatient(api, { name: ' Sara ', identifier: 'S@B.co', password: 'abcdefgh', locale: 'ar' })).toEqual({ otp_sent: true });
  expect(calls[1].body).toEqual({ name: 'Sara', identifier: 's@b.co', password: 'abcdefgh', locale: 'ar', consents: [{ policy_id: 'patient_terms', version: 'v1' }, { policy_id: 'privacy_policy', version: 'v1' }] });
  await expect(registerPatient(apiWith({ '/legal/policies': [{ key: 'x', version: '1' }] }), { name: 'S', identifier: 'a@b.co', password: 'abcdefgh', locale: 'en' })).rejects.toThrow('registration_policy_configuration_missing');
});

test('requestOtp reports a channel-less account instead of throwing', async () => {
  expect(await requestOtp(apiWith({ '/auth/otp/request': new Error('otp_no_channel') }), 'a@b.co')).toEqual({ otp_no_channel: true });
  await expect(requestOtp(apiWith({ '/auth/otp/request': new Error('boom') }), 'a@b.co')).rejects.toThrow('boom');
});

test('forgot and reset use the link-flow endpoints', async () => {
  const api = apiWith({});
  await forgotPassword(api, '0501234567');
  await resetPassword(api, 'tok', 'newpassword');
  expect(calls[0]).toMatchObject({ endpoint: '/auth/password/forgot', body: { identifier: '+966501234567' } });
  expect(calls[1]).toMatchObject({ endpoint: '/auth/password/reset', body: { reset_token: 'tok', new_password: 'newpassword' } });
});

describe('applyOtpInput (a pasted or auto-filled code)', () => {
  const empty = ['', '', '', '', '', ''];
  it('spreads a whole code pasted into the first box and focuses the last box', () => {
    expect(applyOtpInput(empty, '123456', 0)).toEqual({ boxes: ['1', '2', '3', '4', '5', '6'], focus: 5 });
  });
  it('drops non-digits and never runs past the sixth box', () => {
    expect(applyOtpInput(empty, '12-34 5678', 2)).toEqual({ boxes: ['', '', '1', '2', '3', '4'], focus: 5 });
  });
  it('a single digit fills its box and moves on; an empty text clears the box', () => {
    expect(applyOtpInput(empty, '7', 1)).toEqual({ boxes: ['', '7', '', '', '', ''], focus: 2 });
    expect(applyOtpInput(['1', '2', '', '', '', ''], '', 1)).toEqual({ boxes: ['1', '', '', '', '', ''], focus: 1 });
  });
  it('typing over a filled box keeps the new digit', () => {
    expect(applyOtpInput(['1', '', '', '', '', ''], '12', 0).boxes[0]).toBe('2');
  });
});

describe('normalizeIdentifier: a Saudi number typed with 966 and no plus', () => {
  it('is international already; a local 0-number still gets +966', () => {
    expect(normalizeIdentifier('966501234567')).toBe('+966501234567');
    expect(normalizeIdentifier('0501234567')).toBe('+966501234567');
    expect(normalizeIdentifier('501234567')).toBe('+966501234567');
  });
});
