import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from '../app/(auth)/login';
import OtpScreen from '../app/(auth)/otp';
import ForgotPasswordScreen from '../app/(auth)/forgot-password';
import ResetPasswordScreen from '../app/(auth)/reset-password';
import { apiFetch as rootApiFetch, storeAuthSession } from '../utils/api';
import { apiFetch } from '../src/utils/api';
import { createRegistrationTransaction } from '../src/services/auth/RegistrationTransaction';
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
    await type('login-password', 'secret1');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(rootApiFetch).toHaveBeenCalled());
    expect(rootApiFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ method: 'POST', skipAuth: true, body: JSON.stringify({ identifier: 'user@mail.com', password: 'secret1' }) }));
  });

  it('a valid short email (a@b.sa) is sent, not refused by a length check', async () => {
    (rootApiFetch as jest.Mock).mockResolvedValue(LOGIN_ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', 'a@b.sa');
    await type('login-password', 'secret1');
    await fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(rootApiFetch).toHaveBeenCalled());
    expect(screen.queryByText('أدخل بريد إلكتروني أو هاتف صحيح')).toBeNull();
  });

  it.each(['abc', 'a@b', '12345678', 'user@@mail.com'])('"%s" is refused before any request, with the reason', async (bad) => {
    await render(mount(<LoginScreen />).ui);
    await type('login-identifier', bad);
    await type('login-password', 'secret1');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('أدخل بريد إلكتروني أو هاتف صحيح')).toBeTruthy();
    expect(rootApiFetch).not.toHaveBeenCalled();
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
    await type('login-password', 'secret1');
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
    await type('login-password', 'secret1');
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
    await type('login-password', 'secret1');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(await screen.findByText('تعذّر تسجيل الدخول على هذا الجهاز. حاول مرة أخرى.')).toBeTruthy();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Email code (fix: resend purpose, reset flow, refresh token, translated errors)', () => {
  const fillCode = async (code: string) => {
    for (let i = 0; i < 6; i += 1) await fireEvent.changeText(screen.getByTestId(`otp-box-${i}`), code[i]);
  };

  it('resend in register mode asks for a code with purpose "register" (a new email has no account yet)', async () => {
    jest.useFakeTimers();
    try {
      const id = createRegistrationTransaction({ fullName: 'Test User', phone: '+966500000001', email: 'new@mail.com', password: 'secret1' });
      mockParams = { mode: 'register', transactionId: id };
      (apiFetch as jest.Mock).mockResolvedValue({ ok: true, channel: 'email' });
      await render(mount(<OtpScreen />).ui);
      for (let i = 0; i < 61; i += 1) await act(async () => { jest.advanceTimersByTime(1000); });
      await fireEvent.press(screen.getByText('إعادة إرسال الرمز'));
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(apiFetch).toHaveBeenCalledWith('/auth/send-otp', { method: 'POST', body: JSON.stringify({ identifier: 'new@mail.com', purpose: 'register' }) });
    } finally {
      jest.useRealTimers();
    }
  });

  it('resend in reset mode sends the identifier alone (the account exists)', async () => {
    jest.useFakeTimers();
    try {
      mockParams = { mode: 'reset', email: 'a@b.sa' };
      (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
      await render(mount(<OtpScreen />).ui);
      for (let i = 0; i < 61; i += 1) await act(async () => { jest.advanceTimersByTime(1000); });
      await fireEvent.press(screen.getByText('إعادة إرسال الرمز'));
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(apiFetch).toHaveBeenCalledWith('/auth/send-otp', { method: 'POST', body: JSON.stringify({ identifier: 'a@b.sa' }) });
    } finally {
      jest.useRealTimers();
    }
  });

  it('reset mode does not verify the code here (the backend consumes it on a valid check): it goes on with the code', async () => {
    mockParams = { mode: 'reset', email: 'a@b.sa' };
    await render(mount(<OtpScreen />).ui);
    await fillCode('123456');
    await fireEvent.press(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    expect(apiFetch).not.toHaveBeenCalledWith('/auth/verify-otp', expect.anything());
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/(auth)/reset-password', params: { email: 'a@b.sa', code: '123456' } });
  });

  it('register: the refresh token is kept with the access token, and the slice becomes the signed-in patient', async () => {
    const id = createRegistrationTransaction({ fullName: 'Test User', phone: '+966500000001', email: 'new@mail.com', password: 'secret1' });
    mockParams = { mode: 'register', transactionId: id };
    (apiFetch as jest.Mock).mockImplementation(async (path: string) => (path === '/auth/verify-otp' ? { ok: true } : LOGIN_ANSWER));
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    const { store, ui } = mount(<OtpScreen />);
    await render(ui);
    await fillCode('123456');
    await fireEvent.press(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(storeAuthSession).toHaveBeenCalledWith(LOGIN_ANSWER.token);
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: false, token: ACCESS, refreshToken: 'refresh-1' });
  });

  it('a wrong code is announced in the app language, not as the server\'s English', async () => {
    mockParams = { mode: 'register', transactionId: createRegistrationTransaction({ fullName: 'T U', phone: '+966500000002', email: 'x@mail.com', password: 'secret1' }) };
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Invalid OTP code'));
    await render(mount(<OtpScreen />).ui);
    await fillCode('000000');
    await fireEvent.press(screen.getByTestId('otp-submit'));
    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    expect(mockAlert).toHaveBeenCalledWith('common.errorTitle', 'errors.otpInvalid');
  });
});

describe('Forgot password (fix: say what is wrong, translated errors)', () => {
  it('an empty email shows a message instead of doing nothing', async () => {
    await render(mount(<ForgotPasswordScreen />).ui);
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText('أدخل بريدك الإلكتروني')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a malformed email shows a message', async () => {
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', 'not-an-email');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText('أدخل بريدًا إلكترونيًا صحيحًا')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('a valid email asks for the code and opens the code screen in reset mode', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', ' A@B.sa ');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/auth/send-otp', { method: 'POST', body: JSON.stringify({ identifier: 'a@b.sa' }) });
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/(auth)/otp', params: { email: 'a@b.sa', mode: 'reset' } });
  });

  it('the server\'s rate limit is shown translated', async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Too many OTP requests. Please try again after 1 hour.'));
    await render(mount(<ForgotPasswordScreen />).ui);
    await type('forgot-email', 'a@b.sa');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(await screen.findByText('طلبت رموزًا كثيرة. حاول مرة أخرى بعد ساعة.')).toBeTruthy();
  });
});

describe('Reset password (fix: validation messages, code carried over, missing email)', () => {
  it('the code from the code screen arrives pre-filled and the email is taken from the route', async () => {
    mockParams = { email: 'a@b.sa', code: '123456' };
    await render(mount(<ResetPasswordScreen />).ui);
    expect(screen.getByTestId('reset-code').props.value).toBe('123456');
    expect(screen.queryByTestId('reset-email')).toBeNull();
  });

  it('a short password, a mismatch and an empty code each say so', async () => {
    mockParams = { email: 'a@b.sa', code: '' };
    await render(mount(<ResetPasswordScreen />).ui);
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('أدخل رمز التحقق')).toBeTruthy();
    await type('reset-code', '123456');
    await type('reset-password', '123');
    await type('reset-confirm', '123');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('كلمة المرور 6 أحرف على الأقل')).toBeTruthy();
    await type('reset-password', 'secret1');
    await type('reset-confirm', 'secret2');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect((await screen.findAllByText('كلمتا المرور غير متطابقتين')).length).toBeGreaterThan(0);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opened without the email the screen asks for it (it used to send an empty identifier)', async () => {
    mockParams = {};
    await render(mount(<ResetPasswordScreen />).ui);
    expect(screen.getByTestId('reset-email')).toBeTruthy();
    await type('reset-code', '123456');
    await type('reset-password', 'secret1');
    await type('reset-confirm', 'secret1');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('أدخل البريد الإلكتروني الذي وصله الرمز')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    (apiFetch as jest.Mock).mockResolvedValue({ ok: true });
    await type('reset-email', 'A@B.sa');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/auth/reset-password', { method: 'POST', body: JSON.stringify({ identifier: 'a@b.sa', password: 'secret1', code: '123456' }) });
  });

  it('a wrong code from the server is shown translated, and the code field stays editable', async () => {
    mockParams = { email: 'a@b.sa', code: '000000' };
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Invalid OTP code'));
    await render(mount(<ResetPasswordScreen />).ui);
    await type('reset-password', 'secret1');
    await type('reset-confirm', 'secret1');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('رمز التحقق غير صحيح')).toBeTruthy();
    expect(screen.getByTestId('reset-code').props.value).toBe('000000');
  });
});
