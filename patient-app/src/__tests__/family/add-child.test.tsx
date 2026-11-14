import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FamilyAddView } from '../../components/family/FamilyAddView';
import { message } from '../../components/screen/ScreenKit';

/** PT-03: a guardian adds a child (a dependant with no account). Every value is a TEST value. */
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({ tab: 'child' }) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: false }, jest.fn()] }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const k = (key: string) => message('en', key);
const posts = () => mockApiFetch.mock.calls.filter((c) => c[1]?.method === 'POST');
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path === '/family/dependants' && !init?.method) return [{ id: 'dep-1', name: 'Test Child' }];
    return { id: 'dep-2', name: 'Test Child Two' };
  });
});

describe('add a child', () => {
  it('lists the guardian dependants, and the save button stays off until the form is complete with the consent', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><FamilyAddView /></SafeAreaProvider>);
    await screen.findByText('Test Child');
    expect(screen.getByTestId('child-save').props.accessibilityState?.disabled).toBe(true);
    await act(async () => { fireEvent.changeText(screen.getByTestId('child-name'), 'Test Child Two'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('child-birth'), '2020-05-17'); });
    await tap(screen.getByTestId('child-relation-child'));
    expect(screen.getByTestId('child-save').props.accessibilityState?.disabled).toBe(true);
    await tap(screen.getByTestId('child-consent-consent'));
    expect(screen.getByTestId('child-save').props.accessibilityState?.disabled).toBeFalsy();
    expect(posts()).toHaveLength(0);
  });

  it('posts the name, date, relation and the guardian consent, then says it was added', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><FamilyAddView /></SafeAreaProvider>);
    await act(async () => { fireEvent.changeText(await screen.findByTestId('child-name'), 'Test Child Two'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('child-birth'), '2020-05-17'); });
    await tap(screen.getByTestId('child-relation-child'));
    await tap(screen.getByTestId('child-consent-consent'));
    await tap(screen.getByTestId('child-save'));
    await waitFor(() => expect(screen.getByText(k('family.child.saved'))).toBeTruthy());
    expect(JSON.parse(posts()[0][1].body)).toEqual({ name: 'Test Child Two', birth_date: '2020-05-17', relation_code: 'child', guardian_consent: true });
  });

  it('says the limit was reached, and removes a dependant from the list', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><FamilyAddView /></SafeAreaProvider>);
    await screen.findByText('Test Child');
    mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === 'POST') throw new Error('dependants_limit_reached');
      if (init?.method === 'DELETE') return { success: true };
      return [{ id: 'dep-1', name: 'Test Child' }];
    });
    await act(async () => { fireEvent.changeText(screen.getByTestId('child-name'), 'Test Child Two'); });
    await act(async () => { fireEvent.changeText(screen.getByTestId('child-birth'), '2020-05-17'); });
    await tap(screen.getByTestId('child-relation-child'));
    await tap(screen.getByTestId('child-consent-consent'));
    await tap(screen.getByTestId('child-save'));
    await waitFor(() => expect(screen.getByText(k('family.child.limit'))).toBeTruthy());
    await tap(screen.getByTestId('child-remove-dep-1'));
    await waitFor(() => expect(screen.queryByText('Test Child')).toBeNull());
    expect(mockApiFetch.mock.calls.some((c) => c[0] === '/family/dependants/dep-1' && c[1]?.method === 'DELETE')).toBe(true);
  });
});
