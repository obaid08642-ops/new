jest.mock('../../../utils/api', () => ({ apiFetch: jest.fn(), storeAuthSession: jest.fn() }));
jest.mock('../../utils/deviceId', () => ({ getDeviceId: jest.fn().mockResolvedValue('dev-1') }));
jest.mock('../../utils/security', () => ({ secureGet: jest.fn() }));

import { apiFetch, storeAuthSession } from '../../../utils/api';
import { secureGet } from '../../utils/security';
import { createGuestSession, ensureGuestSession } from '../../utils/guestSession';

const jwt = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

describe('silent guest session (owner decision B2)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts /auth/guest with the device id and stores the session', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ token: { accessToken: jwt({ sub: 'g1' }), refreshToken: 'r' }, user: { id: 'g1', role: 'guest' } });
    (storeAuthSession as jest.Mock).mockResolvedValue('tok');
    const s = await createGuestSession();
    expect(apiFetch).toHaveBeenCalledWith('/auth/guest', expect.objectContaining({ method: 'POST', headers: { 'x-device-id': 'dev-1' }, skipAuth: true }));
    expect(storeAuthSession).toHaveBeenCalled();
    expect(s.user.id).toBe('g1');
  });

  it('does nothing when a session (patient or guest) is already stored', async () => {
    (secureGet as jest.Mock).mockResolvedValue('existing-token');
    expect(await ensureGuestSession()).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens a guest session when none is stored', async () => {
    (secureGet as jest.Mock).mockResolvedValue(null);
    (apiFetch as jest.Mock).mockResolvedValue({ token: { accessToken: jwt({ sub: 'g2' }) } });
    (storeAuthSession as jest.Mock).mockResolvedValue('tok');
    const s = await ensureGuestSession();
    expect(s?.user.id).toBe('g2');
    expect(s?.user.role).toBe('guest');
  });

  it('never throws: an unreachable backend leaves the app opening as before', async () => {
    (secureGet as jest.Mock).mockResolvedValue(null);
    (apiFetch as jest.Mock).mockRejectedValue(new Error('network'));
    expect(await ensureGuestSession()).toBeNull();
  });

  it('does not report a session the device could not store', async () => {
    (secureGet as jest.Mock).mockResolvedValue(null);
    (apiFetch as jest.Mock).mockResolvedValue({ token: { accessToken: jwt({ sub: 'g3' }) } });
    (storeAuthSession as jest.Mock).mockResolvedValue(null);
    expect(await ensureGuestSession()).toBeNull();
  });
});
