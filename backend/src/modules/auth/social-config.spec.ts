import { PUBLIC_KEY } from '../../common/auth.guard';
import { PUBLIC_CACHE_KEY } from '../../common/public-cache.decorator';
import { AuthController } from './auth.controller';
import { buildSocialConfig } from './social-config';

const SECRETS = { X_CLIENT_SECRET: 'x-secret-DO-NOT-LEAK', SNAPCHAT_CLIENT_SECRET: 'snap-secret-DO-NOT-LEAK' };
const FULL = {
  GOOGLE_OAUTH_CLIENT_IDS: 'web-123.apps.googleusercontent.com,ios-456.apps.googleusercontent.com,and-789.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: 'ios-456.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: 'and-789.apps.googleusercontent.com',
  APPLE_SIGNIN_CLIENT_IDS: 'plus.nabd.web,plus.nabd.app',
  APPLE_REDIRECT_URI: 'https://nabd.plus/ar/login',
  X_CLIENT_ID: 'x-client', SNAPCHAT_CLIENT_ID: 'snap-client',
  SOCIAL_REDIRECT_URIS: 'https://nabd.plus/ar/login/social-callback',
  ...SECRETS,
};

describe('GET /auth/social/config', () => {
  it('is public and cacheable for 5 minutes, and answers before :id-style routes', () => {
    const handler = AuthController.prototype.socialConfig;
    expect(Reflect.getMetadata(PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata(PUBLIC_CACHE_KEY, handler)).toMatchObject({ ttl: 300 });
    expect(Reflect.getMetadata('path', handler)).toBe('social/config');
    expect(Reflect.getMetadata('method', handler)).toBe(0); // GET
  });

  it('shows nothing enabled when the backend has no credentials', () => {
    const c = buildSocialConfig({});
    expect(c).toEqual({ google: { enabled: false }, apple: { enabled: false }, x: { enabled: false }, snapchat: { enabled: false } });
  });

  it('enables every provider whose credentials are set and returns the public ids', () => {
    const c = buildSocialConfig(FULL);
    expect(c.google).toEqual({ enabled: true, client_id: 'web-123.apps.googleusercontent.com', ios_client_id: 'ios-456.apps.googleusercontent.com', android_client_id: 'and-789.apps.googleusercontent.com' });
    expect(c.apple).toEqual({ enabled: true, client_id: 'plus.nabd.web', redirect_uri: 'https://nabd.plus/ar/login' });
    expect(c.x).toEqual({ enabled: true, client_id: 'x-client' });
    expect(c.snapchat).toEqual({ enabled: true, client_id: 'snap-client' });
  });

  it.each([
    ['google', { GOOGLE_OAUTH_CLIENT_IDS: '' }],
    ['apple', { APPLE_SIGNIN_CLIENT_IDS: '' }],
    ['x', { X_CLIENT_SECRET: '' }],
    ['x', { SOCIAL_REDIRECT_URIS: '' }],
    ['snapchat', { SNAPCHAT_CLIENT_ID: '' }],
    ['snapchat', { SOCIAL_REDIRECT_URIS: '' }],
  ])('%s is off when its credentials are missing (%p)', (provider, override) => {
    expect(buildSocialConfig({ ...FULL, ...override })[provider as 'google'].enabled).toBe(false);
  });

  it.each([
    ['google', 'GOOGLE_SIGNIN_ENABLED'], ['apple', 'APPLE_SIGNIN_ENABLED'], ['x', 'X_SIGNIN_ENABLED'], ['snapchat', 'SNAPCHAT_SIGNIN_ENABLED'],
  ])('the %s gate switches it off with false/0/off/no and leaves it on when unset or true', (provider, gate) => {
    for (const off of ['false', '0', 'off', 'NO']) expect(buildSocialConfig({ ...FULL, [gate]: off })[provider as 'google'].enabled).toBe(false);
    for (const on of [undefined, 'true', '1']) expect(buildSocialConfig({ ...FULL, [gate]: on })[provider as 'google'].enabled).toBe(true);
  });

  it('never advertises a Google id the backend would refuse, nor a non-https Apple redirect', () => {
    const c = buildSocialConfig({ ...FULL, GOOGLE_IOS_CLIENT_ID: 'stranger.apps.googleusercontent.com', GOOGLE_WEB_CLIENT_ID: 'other-web', APPLE_REDIRECT_URI: 'http://nabd.plus/x' });
    expect(c.google.ios_client_id).toBeUndefined();
    expect(c.google.client_id).toBe('web-123.apps.googleusercontent.com');
    expect(c.apple.redirect_uri).toBeUndefined();
  });

  it('never contains a secret', () => {
    const body = JSON.stringify(buildSocialConfig(FULL));
    for (const secret of Object.values(SECRETS)) expect(body).not.toContain(secret);
    expect(body).not.toMatch(/secret/i);
  });
});
