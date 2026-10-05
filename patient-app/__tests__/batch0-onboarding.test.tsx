import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingIntro from '../app/(onboarding)/index';
import OnboardingLanguage from '../app/(onboarding)/language';
import OnboardingPermissions from '../app/(onboarding)/permissions';
import { permissions } from '../src/services/PermissionsManager';
import { STORAGE_KEYS } from '../src/constants';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }], getCalendar: () => 'gregorian' }));
const mockSetLang = jest.fn();
jest.mock('../src/context/AppContext', () => ({
  ...jest.requireActual('../src/context/AppContext'),
  useApp: () => ({ isDark: false, lang: 'ar', isRTL: true, setLang: mockSetLang }),
}));
jest.mock('../src/components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { CONTINUE: 1 },
  AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
}));
jest.mock('../src/services/PermissionsManager', () => ({
  permissions: { check: jest.fn(), request: jest.fn() },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (permissions.check as jest.Mock).mockResolvedValue('undetermined');
});

describe('Onboarding intro (sign-in kit look)', () => {
  it('shows the first slide, five dots, a named Skip and the Next button', async () => {
    await render(wrap(<OnboardingIntro />));
    expect(screen.getByText('رعايتك الصحية الشاملة')).toBeTruthy();
    expect(screen.getByText('احجز أفضل الأطباء في جميع التخصصات في ثوانٍ')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByLabelText('1 / 5').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('تخطي')).toBeTruthy();
    expect(screen.getByLabelText('التالي')).toBeTruthy();
    // no emoji art, no step counter text, no arrow glyph
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/←|\p{Extended_Pictographic}/u);
  });

  it('Next moves through the slides; on the last one the button says Start and leaves for the language step', async () => {
    await render(wrap(<OnboardingIntro />));
    for (let i = 1; i < 5; i++) {
      await fireEvent.press(screen.getByTestId('onboarding-next'));
      expect(screen.getByLabelText(`${i + 1} / 5`).props.accessibilityState.selected).toBe(true);
    }
    expect(screen.getByLabelText('ابدأ رحلتك الصحية')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/language'));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true');
  });

  it('Skip records onboarding as done and leaves for the language step', async () => {
    await render(wrap(<OnboardingIntro />));
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/language'));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true');
  });
});

describe('Onboarding language (Settings board radios)', () => {
  it('lists the six languages as radios with their own names, the current one checked, and no flag emoji', async () => {
    await render(wrap(<OnboardingLanguage />));
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByLabelText('العربية, Arabic').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('English, English').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText('हिन्दी, Hindi')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\p{Regional_Indicator}|\p{Extended_Pictographic}/u);
    // a Latin name in an Arabic screen sits at the start of the row (right), not by its own script
    const style = StyleSheet.flatten(screen.getAllByText('English')[0].props.style);
    expect(style).toMatchObject({ textAlign: 'right', writingDirection: 'rtl' });
  });

  it('choosing a language changes nothing until Continue, which applies it and opens the permissions step', async () => {
    await render(wrap(<OnboardingLanguage />));
    await fireEvent.press(screen.getByTestId('language-ur'));
    expect(mockSetLang).not.toHaveBeenCalled();
    expect(screen.getByTestId('language-ur').props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByTestId('language-continue'));
    expect(mockSetLang).toHaveBeenCalledWith('ur');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/permissions');
  });

  it('has a named back button', async () => {
    await render(wrap(<OnboardingLanguage />));
    await fireEvent.press(screen.getByLabelText('رجوع'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('Onboarding permissions', () => {
  it('asks only for what the app can really request: notifications, camera, location (no health-data row)', async () => {
    await render(wrap(<OnboardingPermissions />));
    expect(screen.getByText('الإشعارات')).toBeTruthy();
    expect(screen.getByText('الكاميرا')).toBeTruthy();
    expect(screen.getByText('الموقع')).toBeTruthy();
    expect(screen.queryByText('البيانات الصحية')).toBeNull();
    expect(screen.getAllByLabelText('السماح')).toHaveLength(3);
    await waitFor(() => expect(permissions.check).toHaveBeenCalledTimes(3));
  });

  it('Allow calls the real permission request for that row and shows the phone\'s answer', async () => {
    (permissions.request as jest.Mock).mockImplementation(async (key: string) => (key === 'camera' ? 'granted' : 'denied'));
    await render(wrap(<OnboardingPermissions />));
    await fireEvent.press(screen.getByTestId('permission-camera-allow'));
    expect(permissions.request).toHaveBeenCalledWith('camera');
    await waitFor(() => expect(screen.getByText('تم السماح')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('permission-location-allow'));
    expect(permissions.request).toHaveBeenCalledWith('location');
    // refused: the dialog cannot be shown again, so the row offers the phone's settings
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await waitFor(() => expect(screen.getByTestId('permission-location-settings')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('permission-location-settings'));
    expect(open).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('permission-notifications-allow'));
    expect(permissions.request).toHaveBeenCalledWith('notifications');
  });

  it('a permission the phone already granted shows as allowed on arrival', async () => {
    (permissions.check as jest.Mock).mockImplementation(async (key: string) => (key === 'notifications' ? 'granted' : 'undetermined'));
    await render(wrap(<OnboardingPermissions />));
    await waitFor(() => expect(screen.getByText('تم السماح')).toBeTruthy());
    expect(screen.getAllByLabelText('السماح')).toHaveLength(2);
  });

  it('Continue and "Skip for now" both finish onboarding and open the welcome screen', async () => {
    await render(wrap(<OnboardingPermissions />));
    await fireEvent.press(screen.getByTestId('permissions-continue'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBe('true');
    mockRouter.replace.mockClear();
    await fireEvent.press(screen.getByTestId('permissions-skip'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
  });
});
