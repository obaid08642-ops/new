import { serverMessage } from './serverMessage';
import { autoTranslate } from '../i18n';
import type { LangCode } from '../context/AppContext';

const FALLBACK = 'auth.err.loginFailed';
const LANGS: LangCode[] = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

describe('serverMessage: what the backend and the api helpers say, as a translation key', () => {
  it.each([
    ['Invalid credentials', 'errors.invalidCredentials'],
    ['Account disabled', 'errors.accountDisabled'],
    ['OTP expired or not requested', 'errors.otpExpired'],
    ['Invalid OTP code', 'errors.otpInvalid'],
    ['Too many OTP requests. Please try again after 1 hour.', 'errors.otpRateLimited'],
    ['Too many OTP verification attempts. Please request a new code.', 'errors.otpLocked'],
    ['Too many invalid attempts. Please request a new code.', 'errors.otpLocked'],
    ['ThrottlerException: Too Many Requests', 'errors.tooManyRequests'],
    ['Email already registered', 'errors.emailRegistered'],
    ['Phone already registered', 'errors.phoneRegistered'],
    ['User not found', 'errors.userNotFound'],
    ['otp_channel_unavailable', 'errors.otpUnavailable'],
    ['OFFLINE_ERROR', 'errors.offline'],
    // the Arabic fallbacks the root helper writes itself
    ['لا يوجد اتصال بالإنترنت — تحقق من الشبكة', 'errors.offline'],
    ['محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة', 'errors.tooManyRequests'],
    ['خطأ في الخادم — حاول مرة أخرى لاحقًا', 'errors.server'],
    ['العنصر المطلوب غير موجود', 'errors.notFound'],
  ])('%s -> %s', (message, key) => {
    expect(serverMessage(new Error(message), FALLBACK)).toBe(key);
    expect(serverMessage(message, FALLBACK)).toBe(key);
  });

  it('a message it does not know is never shown raw: the screen\'s own key is used', () => {
    expect(serverMessage(new Error('E11000 duplicate key error collection: users'), FALLBACK)).toBe(FALLBACK);
    expect(serverMessage(new Error('api_error'), FALLBACK)).toBe(FALLBACK);
    expect(serverMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(serverMessage(new Error(''), FALLBACK)).toBe(FALLBACK);
  });

  it('every key it can return is translated in all six languages (never the key, never English in the others)', () => {
    const keys = [
      'errors.invalidCredentials', 'errors.accountDisabled', 'errors.otpExpired', 'errors.otpInvalid', 'errors.otpRateLimited',
      'errors.otpLocked', 'errors.tooManyRequests', 'errors.emailRegistered', 'errors.phoneRegistered', 'errors.accountRegistered',
      'errors.userNotFound', 'errors.otpUnavailable', 'errors.codeRequired', 'errors.offline', 'errors.server', 'errors.notFound',
    ];
    for (const key of keys) {
      const english = autoTranslate(key, 'en') as string;
      expect(english).not.toBe(key);
      for (const lang of LANGS) {
        const out = autoTranslate(key, lang) as string;
        expect(out).not.toBe(key);
        expect(out.trim().length).toBeGreaterThan(0);
        if (lang !== 'en') expect(out).not.toBe(english);
      }
    }
  });
});
