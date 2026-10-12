import React from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { redirectSystemPath } from '../../app/+native-intent';
import { AppProvider, useApp } from '../context/AppContext';
import { LanguageManager } from '../i18n/LanguageManager';
import { takeDeepLinkLanguage } from '../navigation/deepLinkLanguage';

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));

/**
 * The locale of a web link (/{locale}/...) becomes the app language the same way the language picker sets it:
 * the context language, the stored '@nabdah_language' and the LanguageManager, on a cold start (link before
 * AppProvider, stored language different) and while the app runs.
 */

function Lang() {
  const { lang } = useApp();
  return <Text testID="lang">{lang}</Text>;
}

beforeEach(async () => {
  takeDeepLinkLanguage();
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
});

it('a cold-start link wins over the stored language and is stored like the picker does', async () => {
  await AsyncStorage.setItem('@nabdah_language', 'ar');
  redirectSystemPath({ path: 'https://nabd.plus/fil/p/test-medicine', initial: true });
  render(
    <AppProvider>
      <Lang />
    </AppProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('fil'));
  await waitFor(async () => expect(await AsyncStorage.getItem('@nabdah_language')).toBe('fil'));
  expect(LanguageManager.getInstance().currentLanguage).toBe('fil');
});

it('a link while the app runs switches the language', async () => {
  await AsyncStorage.setItem('@nabdah_language', 'ar');
  render(
    <AppProvider>
      <Lang />
    </AppProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('ar'));
  for (const locale of ['en', 'ur', 'hi', 'bn', 'fil', 'ar'] as const) {
    await act(async () => {
      redirectSystemPath({ path: `https://nabd.plus/${locale}/articles`, initial: false });
    });
    expect(screen.getByTestId('lang').props.children).toBe(locale);
    await waitFor(async () => expect(await AsyncStorage.getItem('@nabdah_language')).toBe(locale));
  }
});

it('a link without a locale leaves the language alone', async () => {
  await AsyncStorage.setItem('@nabdah_language', 'ur');
  render(
    <AppProvider>
      <Lang />
    </AppProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('lang').props.children).toBe('ur'));
  await act(async () => {
    redirectSystemPath({ path: 'https://nabd.plus/p/test-medicine', initial: false });
  });
  expect(screen.getByTestId('lang').props.children).toBe('ur');
});
