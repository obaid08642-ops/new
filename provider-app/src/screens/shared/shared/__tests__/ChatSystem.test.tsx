import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ChatSystem } from '../ChatSystem';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockShow = jest.fn();

jest.mock('../../../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
    useToast: () => ({ show: mockShow }),
    useAuth: () => ({ user: { id: 'doc-1' } }),
  };
});

const THREADS = { threads: [{ id: 'th-1', type: 'booking', booking_kind: 'consultation', booking_id: 'apt-1234', participant_ids: ['doc-1', 'pat-1'], last_message: 'Hello doctor', last_message_at: '2026-10-16T09:00:00.000Z', unread_counts: { 'doc-1': 2 } }], total: 1 };
// the server answers newest first
const MESSAGES = { messages: [
  { id: 'm2', thread_id: 'th-1', sender_id: 'doc-1', type: 'text', body: 'Take it twice a day', createdAt: '2026-10-16T09:05:00.000Z' },
  { id: 'm1', thread_id: 'th-1', sender_id: 'pat-1', type: 'text', body: 'Hello doctor', createdAt: '2026-10-16T09:00:00.000Z' },
], has_more: false };

beforeEach(() => {
  mockGet.mockReset(); mockPost.mockReset(); mockShow.mockReset();
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/chat/threads') return { data: THREADS };
    if (url === '/chat/threads/th-1/messages') return { data: MESSAGES };
    throw new Error(`unexpected GET ${url}`);
  });
});

describe('provider ChatSystem against the real chat service shapes', () => {
  it('lists the conversations and opens one with its messages', async () => {
    await render(<ChatSystem onBack={() => {}} />);
    const row = await screen.findByText('Consultation #1234');
    expect(screen.getByText('Hello doctor')).toBeTruthy();
    await fireEvent.press(row);
    expect(await screen.findByText('Take it twice a day')).toBeTruthy();
    expect(screen.getAllByText('Hello doctor').length).toBeGreaterThan(0);
  });

  it('shows the server refusal and keeps the typed text when sending fails', async () => {
    mockPost.mockRejectedValue({ response: { data: { message: 'The follow-up window has ended' } } });
    await render(<ChatSystem onBack={() => {}} />);
    await fireEvent.press(await screen.findByText('Consultation #1234'));
    await screen.findByText('Take it twice a day');
    const input = screen.getByPlaceholderText('Type a message...');
    await fireEvent.changeText(input, 'second message');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith('The follow-up window has ended', 'error'));
    expect(mockPost).toHaveBeenCalledWith('/chat/threads/th-1/messages', expect.objectContaining({ type: 'text', body: 'second message' }));
    expect(screen.getByDisplayValue('second message')).toBeTruthy();
  });

  it('shows an error state, not an empty list, when the conversations cannot be read', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    await render(<ChatSystem onBack={() => {}} />);
    expect(await screen.findByText('Could not load conversations')).toBeTruthy();
  });
});
