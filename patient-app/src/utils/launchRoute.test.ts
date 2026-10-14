import { launchRoute, needsSilentGuest } from './launchRoute';
import { restoreSession } from './authSession';

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;

describe('launch rule: first launch shows language, intro, Welcome once; every later launch opens Home as a guest', () => {
  it('a fresh install (no session, nothing shown) starts at the language step and opens no guest behind it', () => {
    const state = { hasSession: false, welcomeSeen: false, introDone: false };
    expect(launchRoute(state)).toBe('/(onboarding)/language');
    expect(needsSilentGuest(state)).toBe(false);
  });

  it('the intro was finished or skipped but Welcome has not been shown: Welcome, still no guest behind it', () => {
    const state = { hasSession: false, welcomeSeen: false, introDone: true };
    expect(launchRoute(state)).toBe('/(auth)/welcome');
    expect(needsSilentGuest(state)).toBe(false);
  });

  it('a later launch with no session (Welcome was shown) opens Home with the silent guest session', () => {
    const state = { hasSession: false, welcomeSeen: true, introDone: true };
    expect(launchRoute(state)).toBe('/(tabs)');
    expect(needsSilentGuest(state)).toBe(true);
  });

  it('a device with a session (patient or guest) opens Home and creates nothing', () => {
    for (const welcomeSeen of [true, false]) {
      for (const introDone of [true, false]) {
        const state = { hasSession: true, welcomeSeen, introDone };
        expect(launchRoute(state)).toBe('/(tabs)');
        expect(needsSilentGuest(state)).toBe(false);
      }
    }
  });

  it('an existing install that updates (Welcome shown before, no intro flag) never sees the intro', () => {
    expect(launchRoute({ hasSession: false, welcomeSeen: true, introDone: false })).toBe('/(tabs)');
  });
});

describe('restoreSession: the auth slice is not persisted, so the splash tells it who is stored', () => {
  it('a guest token starts the slice as a guest', () => {
    const action = restoreSession(jwt({ sub: 'g1', role: 'guest', is_guest: true }));
    expect(action?.type).toBe('auth/guestLogin');
    expect(action?.payload).toMatchObject({ user: { id: 'g1', role: 'guest' } });
  });

  it('a patient token starts the slice as a signed-in patient, with the stored refresh token', () => {
    const token = jwt({ sub: 'u1', role: 'patient', phone: '+966500000000', is_guest: false });
    const action = restoreSession(token, 'refresh-1');
    expect(action?.type).toBe('auth/loginSuccess');
    expect(action?.payload).toMatchObject({ token, refreshToken: 'refresh-1', user: { id: 'u1', role: 'patient' } });
  });

  it('nothing for no token, a malformed one, or one with no subject', () => {
    expect(restoreSession(null)).toBeNull();
    expect(restoreSession('not-a-jwt')).toBeNull();
    expect(restoreSession(jwt({ role: 'patient' }))).toBeNull();
  });
});
