import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingIntro from '../app/(onboarding)/intro';
import OnboardingLanguage from '../app/(onboarding)/language';
import { resetIntroGateForTests } from '../src/utils/onboardingGate';
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

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (node: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{node}</SafeAreaProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetIntroGateForTests();
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

  it('Next moves through the slides; on the last one the button says Start, records the intro as done and opens Welcome', async () => {
    await render(wrap(<OnboardingIntro />));
    for (let i = 1; i < 5; i++) {
      await fireEvent.press(screen.getByTestId('onboarding-next'));
      expect(screen.getByLabelText(`${i + 1} / 5`).props.accessibilityState.selected).toBe(true);
    }
    expect(screen.getByLabelText('ابدأ رحلتك الصحية')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('onboarding-next'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.INTRO_DONE)).toBe('true');
  });

  it('Skip records the intro as done and opens Welcome', async () => {
    await render(wrap(<OnboardingIntro />));
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
    expect(await AsyncStorage.getItem(STORAGE_KEYS.INTRO_DONE)).toBe('true');
  });

  it('a storage failure never blocks the user: Skip still opens Welcome', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await render(wrap(<OnboardingIntro />));
    await fireEvent.press(screen.getByTestId('onboarding-skip'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
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

  it('choosing a language applies it at once; Continue opens the intro', async () => {
    await render(wrap(<OnboardingLanguage />));
    await fireEvent.press(screen.getByTestId('language-ur'));
    expect(mockSetLang).toHaveBeenCalledWith('ur');
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('language-continue'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/intro');
  });

  it('is the first screen of the first launch: there is nothing to go back to', async () => {
    await render(wrap(<OnboardingLanguage />));
    expect(screen.queryByLabelText('رجوع')).toBeNull();
  });
});

describe('Onboarding asks for no permission (owner decision 6: permissions are asked in context)', () => {
  const dir = path.join(__dirname, '..', 'app', '(onboarding)');
  const files = fs.readdirSync(dir).filter((f) => /\.tsx?$/.test(f));

  it('the onboarding folder holds only the language step, the intro and the layout', () => {
    expect(files.sort()).toEqual(['_layout.tsx', 'intro.tsx', 'language.tsx']);
  });

  it.each(files)('%s imports no permission API and asks nothing', (file) => {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    expect(source).not.toMatch(/PermissionsManager|requestPermissionsAsync|request\w*PermissionsAsync|expo-(notifications|location|camera|image-picker|media-library)|useCameraPermissions|permissions\.(request|check)/);
  });
});
