import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeQuickTiles } from '../components/home/HomeQuick';
import { SORT_OPTIONS } from '../components/pharmacy/FilterSheet';

/** Layout follow-ups: the Home Reminders tile opens the reminders tab of Medications; the sort chips use the catalogue's own values. */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../utils/api', () => ({ apiFetch: jest.fn() }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

it('the Reminders tile opens /health/medications on the reminders tab', async () => {
  await render(<SafeAreaProvider initialMetrics={metrics}><HomeQuickTiles isHidden={() => false} /></SafeAreaProvider>);
  fireEvent.press(screen.getByTestId('home-quick-reminders'));
  expect(mockPush).toHaveBeenCalledWith('/health/medications?tab=reminders');
});

it('the reminders tab is one of the Medications screen tabs', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../components/health/MedicationsView.tsx'), 'utf8') as string;
  expect(src).toMatch(/const TABS = \[[^\]]*'reminders'/);
});

it('the sort chips send only values the catalogue already accepts', () => {
  expect(SORT_OPTIONS.map((o) => o.id)).toEqual(['relevant', 'price_asc', 'price_desc', 'newest']);
});
