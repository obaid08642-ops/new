import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectedAppsView } from '../../components/account/SettingsViews';
import { message } from '../../components/screen/ScreenKit';
import { parseAgentConnections } from '../../utils/agentConnections';

/** Settings > Connected AI apps (the website's screen on the app): GET and DELETE /patient/agent-connections. */
const mockApi = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ ...jest.requireActual('../../utils/api'), apiFetch: (...a: unknown[]) => mockApi(...a) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('../../components/NotificationAsk', () => ({ NotificationAsk: () => null }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const k = (key: string) => message('en', key);
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => { await act(async () => { fireEvent.press(el); }); };
const rows = [
  { client_id: 'chatgpt', client_name: 'ChatGPT', scopes: ['agent:read', 'agent:book', 'other'], connected_at: '2026-11-01T10:00:00Z' },
  { client_id: 'bad id!', client_name: 'Dropped', scopes: [] },
];
const open = () => render(<SafeAreaProvider initialMetrics={metrics}><ConnectedAppsView /></SafeAreaProvider>);
beforeEach(() => mockApi.mockReset());

describe('parseAgentConnections', () => {
  it('keeps valid client ids and known scopes only', () => {
    expect(parseAgentConnections({ data: rows })).toEqual([{ clientId: 'chatgpt', name: 'ChatGPT', scopes: ['agent:read', 'agent:book'], connectedAt: '2026-11-01T10:00:00Z' }]);
    expect(parseAgentConnections(null)).toEqual([]);
  });
});

describe('Connected AI apps', () => {
  it('lists each assistant with what it may do, and disconnecting calls DELETE and removes it', async () => {
    mockApi.mockImplementation(async (path: string, init?: { method?: string }) => (init?.method === 'DELETE' ? {} : rows));
    await open();
    expect(await screen.findByText('ChatGPT')).toBeTruthy();
    expect(screen.getByText(new RegExp(k('set.apps.scopeRead')))).toBeTruthy();
    expect(screen.queryByText('Dropped')).toBeNull();
    await tap(screen.getByTestId('connected-app-disconnect-chatgpt'));
    expect(mockApi).toHaveBeenCalledWith('/patient/agent-connections/chatgpt', { method: 'DELETE' });
    expect(screen.queryByText('ChatGPT')).toBeNull();
    expect(screen.getByText(new RegExp(k('set.apps.emptyTitle')))).toBeTruthy();
  });

  it('a failed disconnect keeps the assistant and says so', async () => {
    mockApi.mockImplementation(async (_p: string, init?: { method?: string }) => { if (init?.method === 'DELETE') throw new Error('x'); return rows; });
    await open();
    await tap(await screen.findByTestId('connected-app-disconnect-chatgpt'));
    expect(screen.getByText(k('set.apps.failed'))).toBeTruthy();
    expect(screen.getByText('ChatGPT')).toBeTruthy();
  });
});
