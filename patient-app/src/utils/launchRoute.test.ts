import { launchRoute, needsSilentGuest } from './launchRoute';
import { restoreSession } from './authSession';

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;

describe('launch rule: first launch shows Welcome, every later launch opens Home as a guest', () => {
  it('a fresh install (no session, Welcome never shown) goes to Welcome and opens no guest behind it', () => {
    const state = { hasSession: false, welcomeSeen: false };
    expect(launchRoute(state)).toBe('/(auth)/welcome');
    expect(needsSilentGuest(state)).toBe(false);
  });

  it('a later launch with no session (Welcome was shown) opens Home with the silent guest session', () => {
    const state = { hasSession: false, welcomeSeen: true };
    expect(launchRoute(state)).toBe('/(tabs)');
    expect(needsSilentGuest(state)).toBe(true);
  });

  it('a device with a session (patient or guest) opens Home and creates nothing', () => {
    for (const welcomeSeen of [true, false]) {
      const state = { hasSession: true, welcomeSeen };
      expect(launchRoute(state)).toBe('/(tabs)');
      expect(needsSilentGuest(state)).toBe(false);
    }
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
