import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChatLinkRoute from '../../../app/consultations/chat-link';
import { readThreadBooking } from '../../chat/threadLink';
import { resolveWebLink } from '../../navigation/webLinkMap';
import { message } from '../../components/screen/ScreenKit';

/** PT-38: a shared web chat link opens the conversation of the booking the thread belongs to. TEST ids only. */
const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'k') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  apiFetch.mockReset();
  mockReplace.mockReset();
  mockParams.current = { threadId: 'thread-test-1' };
});

describe('the web chat link', () => {
  it('maps to the chat-link screen with the thread id, in every language', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      expect(resolveWebLink(`https://nabd.plus/${lang}/chat/thread-test-1`).route).toBe('/consultations/chat-link?threadId=thread-test-1');
    }
  });

  it('reads the booking id from the permissions answer and nothing else', () => {
    expect(readThreadBooking({ booking_id: 'booking-test-1', can_chat: true })).toBe('booking-test-1');
    expect(readThreadBooking({ data: { booking_id: 'booking-test-2' } })).toBe('booking-test-2');
    expect(readThreadBooking({ booking_id: '../x' })).toBeNull();
    expect(readThreadBooking({})).toBeNull();
    expect(readThreadBooking(null)).toBeNull();
  });

  it('asks the server which booking the thread belongs to and opens that conversation', async () => {
    apiFetch.mockResolvedValue({ booking_id: 'booking-test-1', can_chat: true });
    await render(wrap(<ChatLinkRoute />));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/consultations/chat-with-doctor', params: { appointmentId: 'booking-test-1' } }));
    expect(apiFetch).toHaveBeenCalledWith('/chat/threads/thread-test-1/permissions');
  });

  it('a thread the server does not give shows the error with a retry and the way to the appointments, and opens no conversation', async () => {
    apiFetch.mockRejectedValue(new Error('thread_not_found'));
    await render(wrap(<ChatLinkRoute />));
    await screen.findByText(k('consult.chat.openFailed'));
    expect(mockReplace).not.toHaveBeenCalled();
    apiFetch.mockResolvedValue({ booking_id: 'booking-test-1' });
    await act(async () => { fireEvent.press(screen.getByText(k('common.retry'))); });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/consultations/chat-with-doctor', params: { appointmentId: 'booking-test-1' } }));
  });

  it('an address with no usable thread id calls nothing and shows the error', async () => {
    mockParams.current = { threadId: '../etc' };
    await render(wrap(<ChatLinkRoute />));
    await screen.findByText(k('consult.chat.openFailed'));
    expect(apiFetch).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByText(k('consult.appt.title'))); });
    expect(mockReplace).toHaveBeenCalledWith('/consultations/appointments');
  });
});
