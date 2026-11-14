import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { availableSocialProviders } from '../../components/auth/AuthKit';
import LoginScreen from '../../../app/(auth)/login';
import { withStore } from '../utils/testStore';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('../../../utils/api', () => ({ apiFetch: jest.fn(), storeAuthSession: jest.fn() }));
jest.mock('../../context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }),
}));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('expo-apple-authentication', () => {
  const { View } = require('react-native');
  return {
    AppleAuthenticationButton: (props: object) => <View testID="apple-official-button" {...props} />,
    AppleAuthenticationButtonType: { CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: jest.fn(),
  };
});
jest.mock('../../hooks/useSocialLogin', () => ({
  useSocialLogin: () => ({ signIn: jest.fn(), busy: false, error: null, clearError: jest.fn() }),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const ui = withStore(
  <SafeAreaProvider initialMetrics={metrics}>
    <LoginScreen />
  </SafeAreaProvider>,
);

describe('social providers gate (only providers the backend verifies, Q107)', () => {
  const saved = process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
  afterEach(() => {
    jest.restoreAllMocks();
    if (saved === undefined) delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    else process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT = saved;
  });

  // Owner, 2026-10-25: every provider shows before its keys are set; one without keys says "not available" when pressed.
  it('android: google, X and Snapchat (never Apple)', () => {
    delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(availableSocialProviders()).toEqual(['google', 'x', 'snapchat']);
  });

  it('ios: apple first, then google, X and Snapchat', () => {
    delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(availableSocialProviders()).toEqual(['apple', 'google', 'x', 'snapchat']);
  });

  it('web: google, X and Snapchat (no Apple)', () => {
    delete process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT;
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(availableSocialProviders()).toEqual(['google', 'x', 'snapchat']);
  });

  it('flag on: X and Snapchat come back after google', () => {
    process.env.EXPO_PUBLIC_SOCIAL_X_SNAPCHAT = '1';
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(availableSocialProviders()).toEqual(['apple', 'google', 'x', 'snapchat']);
  });
});

describe('Login screen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('has no OTP-login link, keeps the forgot-password link, and shows the social row', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(ui);
    const { queryByText, queryAllByText, getByLabelText } = screen;
    expect(queryByText('الدخول برمز التحقق')).toBeNull();
    expect(queryAllByText('نسيت كلمة المرور؟').length).toBe(1);
    expect(queryByText('أو تابع عبر')).not.toBeNull();
    expect(getByLabelText('المتابعة مع Google')).toBeTruthy();
    // Owner, 2026-10-25: X and Snapchat show before their keys are set (pressing one says "not available").
    expect(screen.queryByLabelText('المتابعة مع X')).toBeTruthy();
    expect(screen.queryByLabelText('المتابعة مع Snapchat')).toBeTruthy();
  });

  it('ios: the official Apple button is rendered', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await render(ui);
    const { getByTestId } = screen;
    expect(getByTestId('apple-official-button')).toBeTruthy();
  });
});
