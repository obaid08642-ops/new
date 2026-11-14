import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FamilyMemberView } from '../../components/family/FamilyMemberView';
import { getBookingFor, setBookingFor } from '../../utils/bookingFor';

/**
 * PT-03: "Book on their behalf" on a family member carries THAT member (id and name, not the signed-in patient) into the
 * booking flow, which then sends it as for_member_id (tested in consult/booking-screens). All values are TEST values.
 */
const mockApiFetch = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({ id: 'minor-1', name: 'Test Child', relation: 'child' }) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => { mockApiFetch.mockReset(); mockPush.mockReset(); setBookingFor(null); });

describe('family member: book on their behalf', () => {
  it('stores the member as the booking subject and opens the consultations booking', async () => {
    mockApiFetch.mockResolvedValue({ vitals: [], meds: [], next_appointment: null });
    await render(wrap(<FamilyMemberView />));
    await act(async () => { fireEvent.press(await screen.findByTestId('member-book')); });
    expect(getBookingFor()).toEqual({ id: 'minor-1', name: 'Test Child' });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/consultations');
  });

  it('sets no booking subject before the button is pressed', async () => {
    mockApiFetch.mockResolvedValue({});
    await render(wrap(<FamilyMemberView />));
    await screen.findByTestId('member-book');
    expect(getBookingFor()).toBeNull();
  });
});
