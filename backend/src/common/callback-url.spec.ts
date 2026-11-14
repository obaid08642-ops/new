import { isAllowedCallbackUrl } from './callback-url';

describe('isAllowedCallbackUrl (gateway return address)', () => {
  it.each([
    'https://nabd.plus/api/v1/moyasar/callback',
    'https://api.nabd.plus/api/v1/moyasar/callback?x=1',
    'https://admin.nabd.plus/pay',
    'https://NABD.PLUS/return',
    'nabdplus://payment/return',
  ])('allows %s', (u) => expect(isAllowedCallbackUrl(u, undefined)).toBe(true));

  it.each([
    'https://evil.example/pay',
    'https://nabd.plus.evil.example/pay',
    'https://evilnabd.plus/pay',
    'https://nabd.plus@evil.example/pay',
    'https://user:pw@nabd.plus/pay',
    'http://nabd.plus/pay',
    'https://nabd.plus:8443/pay',
    'https://sub.nabd.plus/pay',
    'javascript:alert(1)',
    'otherapp://payment/return',
    'ftp://nabd.plus/x',
    '//evil.example',
    'nabd.plus/pay',
    '',
  ])('refuses %s', (u) => expect(isAllowedCallbackUrl(u, undefined)).toBe(false));

  it('refuses non-strings and very long values', () => {
    expect(isAllowedCallbackUrl(undefined, undefined)).toBe(false);
    expect(isAllowedCallbackUrl({}, undefined)).toBe(false);
    expect(isAllowedCallbackUrl('https://nabd.plus/' + 'a'.repeat(3000), undefined)).toBe(false);
  });

  it('the host of PUBLIC_APP_URL (staging) is allowed, an unusable PUBLIC_APP_URL adds nothing', () => {
    expect(isAllowedCallbackUrl('https://staging.nabd.example/cb', 'https://staging.nabd.example')).toBe(true);
    expect(isAllowedCallbackUrl('https://staging.nabd.example/cb', 'not a url')).toBe(false);
    expect(isAllowedCallbackUrl('https://staging.nabd.example/cb', 'http://staging.nabd.example')).toBe(false);
  });
});
