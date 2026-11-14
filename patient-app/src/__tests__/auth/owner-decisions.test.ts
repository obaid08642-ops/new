import { isValidNewPassword, PASSWORD_MIN_LENGTH, startSession } from '../../utils/authSession';
import { providerLinks } from '../../config/providerLinks';

const mockStore = jest.fn();
jest.mock('../../../utils/api', () => ({ storeAuthSession: (...a: unknown[]) => mockStore(...a) }));

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64')}.s`;

describe('password minimum', () => {
  it('is 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(isValidNewPassword('1234567')).toBe(false);
    expect(isValidNewPassword('12345678')).toBe(true);
  });
});

describe('a non-patient account on the patient app', () => {
  beforeEach(() => mockStore.mockReset().mockResolvedValue(true));
  it('gets no session: nothing stored, nothing dispatched', async () => {
    const dispatch = jest.fn();
    const r = await startSession({ token: { accessToken: jwt({ sub: '1', role: 'provider' }), refreshToken: 'r' } }, dispatch);
    expect(r).toEqual({ ok: false, reason: 'not_patient' });
    expect(mockStore).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('a patient still gets one', async () => {
    const dispatch = jest.fn();
    const r = await startSession({ token: { accessToken: jwt({ sub: '1', role: 'patient' }), refreshToken: 'r' } }, dispatch);
    expect(r.ok).toBe(true);
    expect(dispatch).toHaveBeenCalled();
  });
});

describe('provider links', () => {
  it('shows only configured https links', () => {
    expect(providerLinks({})).toEqual({ web: null, ios: null, android: null });
    expect(providerLinks({ EXPO_PUBLIC_PROVIDER_WEB_URL: 'https://provider.example', EXPO_PUBLIC_PROVIDER_APP_IOS_URL: 'javascript:x' })).toEqual({ web: 'https://provider.example', ios: null, android: null });
  });
});
