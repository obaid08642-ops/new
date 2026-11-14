import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import authReducer from '../src/store/slices/authSlice';

// Boundaries only: the API, the router, the in-app browser and the app context. Fixtures live in this test, never in a screen.
const mockApiFetch = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockOpenBrowser = jest.fn(async () => ({ type: 'opened' }));
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), hasSession: async () => true, BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({ get router() { return mockRouter; }, useLocalSearchParams: () => ({}) }));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (...a: unknown[]) => mockOpenBrowser(...(a as [])), maybeCompleteAuthSession: jest.fn() }));
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import AddPolicyScreen from '../app/insurance/add-policy';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const store = configureStore({ reducer: { auth: authReducer } });
const CHI = 'https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx';
const companies = [
  { id: 'c1', code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia' },
  { id: 'c2', code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya' },
];
const classes = [
  { code: 'class-b', name_ar: 'الفئة ب', name_en: 'Class B', copay_percent: 10, copay_cap_sar: 200 },
  { code: 'tier-1', name_ar: 'الأولى', name_en: 'Tier 1' },
];

async function boot(config: unknown = { links: { chi_inquiry: CHI } }) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/insurance/companies') return companies;
    if (path === '/config') return config;
    if (path.endsWith('/networks')) return classes;
    return { ok: true };
  });
  await render(<Provider store={store}><SafeAreaProvider initialMetrics={metrics}><AddPolicyScreen /></SafeAreaProvider></Provider>);
}

beforeEach(() => { jest.clearAllMocks(); });

describe('add insurance card', () => {
  it('searches the insurers and narrows the list', async () => {
    await boot();
    await screen.findByTestId('add-company-c1');
    expect(screen.getByTestId('add-company-c2')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('add-company-search'), 'tawun');
    await waitFor(() => expect(screen.queryByTestId('add-company-c1')).toBeNull());
    expect(screen.getByTestId('add-company-c2')).toBeTruthy();
  });

  it('offers the insurer\'s classes, fills the copay boxes from the chosen one, keeps them editable and saves class + figures', async () => {
    await boot();
    await fireEvent.press(await screen.findByTestId('add-company-c1'));
    await fireEvent.press(await screen.findByTestId('add-class-class-b'));
    expect(screen.getByTestId('add-copay-percent').props.value).toBe('10');
    expect(screen.getByTestId('add-copay-cap').props.value).toBe('200');
    await fireEvent.changeText(screen.getByTestId('add-copay-percent'), '15');
    await fireEvent.changeText(screen.getByTestId('add-policy-number'), 'POL-123');
    await fireEvent.press(screen.getByTestId('add-save'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const call = mockApiFetch.mock.calls.find((c) => c[0] === '/insurance/save-policy');
    const body = JSON.parse((call?.[1] as { body: string }).body);
    expect(body).toMatchObject({ company_id: 'bupa', policy_number: 'POL-123', network: 'class-b', class: 'class-b', copay_percent: 15, copay_cap_sar: 200 });
  });

  it('leaves typed figures alone for a class that has none, and sends no class when none is chosen', async () => {
    await boot();
    await fireEvent.press(await screen.findByTestId('add-company-c1'));
    await fireEvent.changeText(screen.getByTestId('add-copay-percent'), '30');
    await fireEvent.press(await screen.findByTestId('add-class-tier-1'));
    expect(screen.getByTestId('add-copay-percent').props.value).toBe('30');
    await fireEvent.press(screen.getByTestId('add-class-tier-1'));
    await fireEvent.changeText(screen.getByTestId('add-policy-number'), 'POL-9');
    await fireEvent.press(screen.getByTestId('add-save'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const body = JSON.parse((mockApiFetch.mock.calls.find((c) => c[0] === '/insurance/save-policy')?.[1] as { body: string }).body);
    expect(body.class).toBeUndefined();
    expect(body.network).toBeUndefined();
    expect(body.copay_percent).toBe(30);
  });

  it('opens the official CHI page in the in-app browser', async () => {
    await boot();
    await fireEvent.press(await screen.findByTestId('add-chi-link'));
    expect(mockOpenBrowser).toHaveBeenCalledWith(CHI);
  });

  it('draws no CHI link when /config has no valid address', async () => {
    await boot({ links: { chi_inquiry: 'https://evil.example/chi' } });
    await screen.findByTestId('add-company-c1');
    expect(screen.queryByTestId('add-chi-link')).toBeNull();
  });
});
