import { requestErrorKind, requestErrorText } from '../requestError';

describe('request errors (15.1)', () => {
  it('tells a timeout, no connection, a refusal to slow down and a server error apart', () => {
    expect(requestErrorKind({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' })).toBe('timeout');
    expect(requestErrorKind(new Error('REQUEST_TIMEOUT'))).toBe('timeout');
    expect(requestErrorKind({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe('offline');
    expect(requestErrorKind(new Error('Network request failed'))).toBe('offline');
    expect(requestErrorKind({ response: { status: 429 }, message: 'x' })).toBe('rate_limited');
    expect(requestErrorKind({ response: { status: 503 }, message: 'x' })).toBe('server');
    expect(requestErrorKind(new Error('REQUEST_ABORTED'))).toBe('cancelled');
    expect(requestErrorKind({ response: { status: 400 }, message: 'insufficient_available_balance' })).toBe('other');
  });

  it('gives the sentence and the next step in both languages, and nothing for another error', () => {
    expect(requestErrorText({ code: 'ECONNABORTED' }, false)).toMatch(/try again/);
    expect(requestErrorText({ code: 'ERR_NETWORK' }, true)).toMatch(/تحقق من الشبكة/);
    expect(requestErrorText({ response: { status: 500 }, message: 'x' }, false)).toMatch(/contact support/);
    expect(requestErrorText({ response: { status: 400 }, message: 'x' }, true)).toBeNull();
    expect(requestErrorText(new Error('REQUEST_ABORTED'), true)).toBeNull();
  });
});
