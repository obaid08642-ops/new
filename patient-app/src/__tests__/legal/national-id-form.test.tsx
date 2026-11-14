import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NationalIdForm } from '../../components/consult/NationalIdForm';
import { message } from '../../components/screen/ScreenKit';

/** Owner decision 6: the ID number form saves only a valid number, through PUT /care/sick-leaves/national-id. TEST values only. */
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'test-key-0001', BASE_URL: 'https://api.example.test/api/v1' }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const k = (key: string) => message('en', key);
beforeEach(() => mockApiFetch.mockReset());

describe('the national ID form', () => {
  it('says the number is invalid and sends nothing', async () => {
    await render(<SafeAreaProvider initialMetrics={metrics}><NationalIdForm /></SafeAreaProvider>);
    await fireEvent.changeText(screen.getByTestId('national-id-input'), '1000000009');
    await act(async () => { fireEvent.press(screen.getByTestId('national-id-save')); });
    expect(screen.getByText(k('consult.nationalId.invalid'))).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
  it('saves a valid number with PUT and tells the screen', async () => {
    mockApiFetch.mockResolvedValue({ has_national_id: true });
    const onSaved = jest.fn();
    await render(<SafeAreaProvider initialMetrics={metrics}><NationalIdForm onSaved={onSaved} /></SafeAreaProvider>);
    await fireEvent.changeText(screen.getByTestId('national-id-input'), '1000000008');
    await act(async () => { fireEvent.press(screen.getByTestId('national-id-save')); });
    expect(mockApiFetch).toHaveBeenCalledWith('/care/sick-leaves/national-id', { method: 'PUT', body: JSON.stringify({ national_id: '1000000008' }) });
    expect(onSaved).toHaveBeenCalled();
    expect(screen.getByText(k('consult.nationalId.saved'))).toBeTruthy();
  });
  it('shows a failure and keeps the form when the save fails', async () => {
    mockApiFetch.mockRejectedValue(new Error('x'));
    await render(<SafeAreaProvider initialMetrics={metrics}><NationalIdForm /></SafeAreaProvider>);
    await fireEvent.changeText(screen.getByTestId('national-id-input'), '1000000008');
    await act(async () => { fireEvent.press(screen.getByTestId('national-id-save')); });
    expect(screen.getByText(k('consult.nationalId.failed'))).toBeTruthy();
  });
});
