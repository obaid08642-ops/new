import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from '../app/(auth)/login';
import OtpScreen from '../app/(auth)/otp';
import ForgotPasswordScreen from '../app/(auth)/forgot-password';
import ResetPasswordScreen from '../app/(auth)/reset-password';
import { apiFetch as rootApiFetch, storeAuthSession } from '../utils/api';
import { apiFetch } from '../src/utils/api';
import { guestLogin } from '../src/store/slices/authSlice';
import { makeStore, withStore } from '../src/__tests__/utils/testStore';

/**
 * Batch 0 fixes, client side, sign-in family: what the screens send, what they keep and what the user reads.
 * Contracts checked against the seeded backend (POST /auth/login, /auth/send-otp, /auth/verify-otp,
 * /auth/reset-password): see docs/design/audit/batch-0-fixes.md.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
}));
// the root client (login) and the src client (otp, forgot, reset)
jest.mock('../utils/api', () => ({ apiFetch: jest.fn(), storeAuthSession: jest.fn() }));
jest.mock('../src/utils/api', () => ({ apiFetch: jest.fn() }));
const mockAlert = jest.fn();
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: (...args: unknown[]) => mockAlert(...args) }));
let mockLang = 'ar';
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));
jest.mock('../src/components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('expo-apple-authentication', () => ({ AppleAuthenticationButton: () => null, AppleAuthenticationButtonType: { CONTINUE: 1 }, AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 }, AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 }, signInAsync: jest.fn() }));
jest.mock('../src/hooks/useSocialLogin', () => ({ useSocialLogin: () => ({ signIn: jest.fn(), busy: false, error: null, clearError: jest.fn() }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const mount = (screenUi: React.ReactElement, store = makeStore()) => ({
  store,
  ui: withStore(<SafeAreaProvider initialMetrics={metrics}>{screenUi}</SafeAreaProvider>, store),
});

/** An unsigned JWT with the claims the backend puts in an access token. */
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;
const ACCESS = jwt({ sub: 'u1', role: 'patient', is_guest: false });
const LOGIN_ANSWER = { user: { id: 'u1', full_name: 'أحمد السالم', role: 'patient' }, token: { accessToken: ACCESS, refreshToken: 'refresh-1' } };

const type = async (testID: string, text: string) => fireEvent.changeText(screen.getByTestId(testID), text);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockLang = 'ar';
});

describe('Login (fix: skipAuth, identifier validation, session state, translated errors)', () => {
  it('sends the login without the stored guest token and without being able to clear it (skipAuth)', async () => {
    (rootApiFetch as jest.Mock).mockResolvedValue(LOGIN_ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(rootApiFetch).toHaveBeenCalled());
    expect(rootApiFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ method: 'POST', skipAuth: true, body: JSON.stringify({ identifier: 'user@mail.com', password: 'secret12' }) }));
  });

  it('a valid short email (a@b.sa) is sent, not refused by a length check', async () => {
    (rootApiFetch as jest.Mock).mockResolvedValue(LOGIN_ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'a@b.sa');
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(rootApiFetch).toHaveBeenCalled());
    expect(screen.queryByText('أدخل بريد إلكتروني أو هاتف صحيح')).toBeNull();
  });

  it.each(['abc', 'a@b', '12345678', 'user@@mail.com'])('"%s" is refused before any request, with the reason', async (bad) => {
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', bad);
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('أدخل بريد إلكتروني أو هاتف صحيح')).toBeTruthy();
    // the screen reads the public social config on mount; nothing else (no login request) may have been sent
    expect((rootApiFetch as jest.Mock).mock.calls.filter((c) => c[0] !== '/auth/social/config')).toEqual([]);
  });

  it('a wrong password shows the message in the app language, never the server\'s English', async () => {
    (rootApiFetch as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'wrong-pw');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة')).toBeTruthy();
    expect(screen.queryByText('Invalid credentials')).toBeNull();
  });

  it.each([
    ['en', 'The email, phone number or password is incorrect'],
    ['ur', 'ای میل، فون نمبر یا پاس ورڈ درست نہیں ہے'],
  ])('the same error in %s', async (lang, text) => {
    mockLang = lang;
    (rootApiFetch as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'wrong-pw');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('an unknown server message is shown as the generic translated one, not raw', async () => {
    (rootApiFetch as jest.Mock).mockRejectedValue(new Error('E11000 duplicate key'));
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('فشل تسجيل الدخول، حاول مجدداً')).toBeTruthy();
    expect(screen.queryByText('E11000 duplicate key')).toBeNull();
  });

  it('after the login the auth slice is a signed-in patient (isGuest cleared) with both tokens kept', async () => {
    (rootApiFetch as jest.Mock).mockResolvedValue(LOGIN_ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    const { store, ui } = mount(<LoginScreen />);
    store.dispatch(guestLogin({ user: { id: 'g1', role: 'guest' } as never, token: 'guest-token' }));
    expect(store.getState().auth.isGuest).toBe(true);
    await render(ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(storeAuthSession).toHaveBeenCalledWith(LOGIN_ANSWER.token); // access and refresh token together
    const { auth } = store.getState();
    expect(auth).toMatchObject({ isAuthenticated: true, isGuest: false, token: ACCESS, refreshToken: 'refresh-1' });
    expect(auth.user).toMatchObject({ id: 'u1' });
  });

  it('when secure storage refuses the token nothing is claimed: no session in the slice, no navigation, a message', async () => {
    (rootApiFetch as jest.Mock).mockResolvedValue(LOGIN_ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(null);
    const { store, ui } = mount(<LoginScreen />);
    await render(ui);
    await type('login-identifier', 'user@mail.com');
    await type('login-password', 'secret12');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('تعذّر تسجيل الدخول على هذا الجهاز. حاول مرة أخرى.')).toBeTruthy();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

const ar = require('../src/i18n/locales/ar.json') as Record<string, string>;

describe('Email code (canonical verify + exchange, resend, translated errors)', () => {
  const fillCode = async (code: string) => {
    for (let i = 0; i < 6; i += 1) await fireEvent.changeText(screen.getByTestId(`otp-box-${i}`), code[i]);
  };

  it('resend asks the canonical otp/request for the identifier', async () => {
    jest.useFakeTimers();
    try {
      mockParams = { mode: 'register', identifier: 'new@mail.com' };
      (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
      await render(mount(<OtpScreen />).ui);
      for (let i = 0; i < 61; i += 1) await act(async () => { jest.advanceTimersByTime(1000); });
      await fireEvent.press(screen.getByText('إعادة إرسال الرمز'));
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(apiFetch).toHaveBeenCalledWith('/auth/otp/request', { method: 'POST', body: JSON.stringify({ identifier: 'new@mail.com' }), skipAuth: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it('the code is verified, exchanged for the pair, and the slice becomes the signed-in patient', async () => {
    mockParams = { mode: 'login', identifier: 'new@mail.com' };
    (apiFetch as jest.Mock).mockImplementation(async (path: string) => (path === '/auth/otp/verify'
      ? { exchange_token: 'ex' }
      : { access_token: ACCESS, refresh_token: 'refresh-1' }));
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    const { store, ui } = mount(<OtpScreen />);
    await render(ui);
    await fillCode('123456');
    await fireEvent.press(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(apiFetch).toHaveBeenCalledWith('/auth/otp/verify', expect.objectContaining({ body: JSON.stringify({ identifier: 'new@mail.com', code: '123456' }) }));
    expect(storeAuthSession).toHaveBeenCalledWith({ accessToken: ACCESS, refreshToken: 'refresh-1' });
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: false, token: ACCESS, refreshToken: 'refresh-1' });
  });

  it('a wrong code is announced in the app language, not as the server\'s English', async () => {
    mockParams = { mode: 'register', identifier: 'x@mail.com' };
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Invalid OTP code'));
    await render(mount(<OtpScreen />).ui);
    await fillCode('000000');
    await fireEvent.press(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    expect(mockAlert).toHaveBeenCalledWith('common.errorTitle', 'errors.otpInvalid');
  });
});

describe('Forgot password (link flow, e-mail or phone)', () => {
  it('an empty identifier shows a message instead of doing nothing', async () => {
    await render(mount(<ForgotPasswordScreen />).ui);
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText('أدخل بريدك الإلكتروني')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a malformed identifier shows a message', async () => {
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', 'x');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText(ar['auth.err.identifier'])).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each([[' A@B.sa ', 'a@b.sa'], ['0501234567', '+966501234567']])('%s asks for the reset link (password/forgot) and says to check the inbox', async (typed, sent) => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', typed);
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText(ar['auth.forgot.sentTitle'])).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ identifier: sent }), skipAuth: true });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('the server\'s rate limit is shown translated', async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Too many OTP requests. Please try again after 1 hour.'));
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', 'a@b.sa');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText('طلبت رموزًا كثيرة. حاول مرة أخرى بعد ساعة.')).toBeTruthy();
  });
});

describe('Reset password (token from the e-mail link)', () => {
  it('without a token the screen says the link is not valid and offers a new one', async () => {
    mockParams = {};
    await render(mount(<ResetPasswordScreen />).ui);
    expect(screen.getByTestId('reset-request-new')).toBeTruthy();
    expect(screen.queryByTestId('reset-code')).toBeNull();
  });

  it('a short password and a mismatch each say so', async () => {
    mockParams = { token: 'tok' };
    await render(mount(<ResetPasswordScreen />).ui);
    await type('reset-password', '123');
    await type('reset-confirm', '123');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('كلمة المرور 8 أحرف على الأقل')).toBeTruthy();
    await type('reset-password', 'secret12');
    await type('reset-confirm', 'secret2');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect((await screen.findAllByText('كلمتا المرور غير متطابقتين')).length).toBeGreaterThan(0);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends the token and the new password to password/reset', async () => {
    mockParams = { token: 'tok' };
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
    await render(mount(<ResetPasswordScreen />).ui);
    await type('reset-password', 'secret12');
    await type('reset-confirm', 'secret12');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/auth/password/reset', { method: 'POST', body: JSON.stringify({ reset_token: 'tok', new_password: 'secret12' }), skipAuth: true });
  });

  it('an expired token from the server is shown translated', async () => {
    mockParams = { token: 'old' };
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Invalid OTP code'));
    await render(mount(<ResetPasswordScreen />).ui);
    await type('reset-password', 'secret12');
    await type('reset-confirm', 'secret12');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('رمز التحقق غير صحيح')).toBeTruthy();
  });
});
