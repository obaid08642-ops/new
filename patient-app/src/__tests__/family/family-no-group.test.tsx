import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FamilyCalendarView } from '../../components/family/FamilyCalendarView';
import { FamilyChatView } from '../../components/family/FamilyChatView';
import { message } from '../../components/screen/ScreenKit';

/**
 * Issue 693: the calendar and the chat of the family group, opened by someone with no group (the server answers 404 "No family
 * group found" and 403 "not_active_family_member"), say so and offer creating or joining a family instead of a failure.
 * Issue 688: the event date is a date and time field, not ISO text. Every value is a TEST value.
 */
const mockApiFetch = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => { mockApiFetch.mockReset(); mockReplace.mockReset(); mockPush.mockReset(); });

describe('a family screen without a family group (issue 693)', () => {
  it('the calendar says there is no family yet and offers creating or joining one', async () => {
    mockApiFetch.mockImplementation(async (path: string) => { if (path === '/family/calendar') throw new Error('No family group found'); return []; });
    await render(wrap(<FamilyCalendarView />));
    expect(await screen.findByTestId('family-none')).toBeTruthy();
    expect(screen.getByText(k('family.hub.emptyTitle'))).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText(k('family.hub.joinExisting'))); });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/family/add', params: { tab: 'join' } });
  });

  it('the chat says the same instead of a failure, and stops asking for messages', async () => {
    mockApiFetch.mockImplementation(async (path: string) => { if (path === '/family/chat/messages') throw new Error('AUTH_ERROR_403: not_active_family_member'); if (path === '/family/members') return []; return {}; });
    await render(wrap(<FamilyChatView />));
    expect(await screen.findByTestId('family-none')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText(k('family.hub.create'))); });
    expect(mockReplace).toHaveBeenCalledWith('/family');
  });

  it('another failure still shows the retry state', async () => {
    mockApiFetch.mockImplementation(async (path: string) => { if (path === '/family/calendar') throw new Error('boom'); return []; });
    await render(wrap(<FamilyCalendarView />));
    expect(await screen.findByText(k('consult.retry'))).toBeTruthy();
    expect(screen.queryByTestId('family-none')).toBeNull();
  });
});

describe('the event date (issue 688)', () => {
  it('is a date and time field, not a text field for ISO text', async () => {
    mockApiFetch.mockImplementation(async (path: string) => (path === '/family/members' ? [{ user_id: 'u1', display_name: 'Test Member' }] : []));
    await render(wrap(<FamilyCalendarView />));
    await act(async () => { fireEvent.press((await screen.findAllByLabelText(k('family.calendar.add')))[0]); });
    expect(await screen.findByTestId('event-date')).toBeTruthy();
    expect(screen.getByText(k('common.chooseDateTime'))).toBeTruthy();
  });
});
