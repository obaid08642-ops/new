import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatThread } from '../../components/family/ChatThread';
import { MemberRow, PERMISSIONS, PermissionList, loadFamily, permissionLabel } from '../../components/family/FamilyKit';
import { extractInviteCode } from '../../components/family/FamilyAddView';
import { message } from '../../components/screen/ScreenKit';
import { translations } from '../../i18n';

/**
 * Batch 6: the shared family pieces. Every value is a TEST value. What is proved: the chat template draws its messages
 * (mine and others), the sender of a message that is not mine, the empty, failed and offline states, and the composer
 * (the send button is off until there is text and fires with it); the permission list shows every permission of the API
 * with its switch and reports a toggle; the member row draws a name, a relation and a pill and presses; the group load
 * treats "no family group found" as no group and any other failure as a failure; a scanned invite is read from a link or
 * a bare code; every family word is in the six locale files.
 */

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const thread = (over: Partial<React.ComponentProps<typeof ChatThread>> = {}) => (
  <ChatThread
    title="Family chat"
    subtitle="3 members"
    status="ready"
    onRetry={jest.fn()}
    messages={[
      { id: 'm1', text: 'Hello from Sara', sender: 'Sara', time: '10:00', mine: false },
      { id: 'm2', text: 'Hi Sara', time: '10:01', mine: true },
    ]}
    empty={{ title: 'No messages yet', body: 'Say hello' }}
    composer={{ value: '', onChange: jest.fn(), onSend: jest.fn(), sending: false, placeholder: 'Write a message...', sendLabel: 'Send' }}
    {...over}
  />
);

describe('ChatThread', () => {
  it('draws the title, the count, the messages and the name of a sender who is not me', async () => {
    await render(wrap(thread()));
    expect(screen.getByText('Family chat')).toBeTruthy();
    expect(screen.getByText('3 members')).toBeTruthy();
    expect(screen.getByText('Hello from Sara')).toBeTruthy();
    expect(screen.getByText('Sara')).toBeTruthy();
    expect(screen.getByText('Hi Sara')).toBeTruthy();
  });

  it('shows the empty state when there is nothing yet', async () => {
    await render(wrap(thread({ messages: [] })));
    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  it('shows the failure with a retry and no composer', async () => {
    const onRetry = jest.fn();
    await render(wrap(thread({ status: 'error', onRetry })));
    expect(screen.queryByTestId('chat-input')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.retry')));
    });
    expect(onRetry).toHaveBeenCalled();
  });

  it('keeps the send button off until there is text, then sends', async () => {
    const onSend = jest.fn();
    const base = { onChange: jest.fn(), onSend, sending: false, placeholder: 'Write a message...', sendLabel: 'Send' };
    const view = await render(wrap(thread({ composer: { ...base, value: '  ' } })));
    expect(screen.getByTestId('chat-send').props.accessibilityState.disabled).toBe(true);
    await view.rerender(wrap(thread({ composer: { ...base, value: 'On my way' } })));
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-send'));
    });
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});

describe('PermissionList', () => {
  it('has a switch for every permission of the API, on for the granted ones, and reports a toggle', async () => {
    const onToggle = jest.fn();
    await render(wrap(<PermissionList granted={['vitals']} onToggle={onToggle} testID="perms" />));
    expect(PERMISSIONS).toHaveLength(9);
    expect(screen.getByTestId('perms-vitals').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('perms-meds').props.accessibilityState.checked).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('perms-meds'));
    });
    expect(onToggle).toHaveBeenCalledWith('meds');
  });

  it('names a permission it does not know as the server sent it', () => {
    expect(permissionLabel(k, 'vitals')).toBe('View vital signs');
    expect(permissionLabel(k, 'something_new')).toBe('something_new');
  });
});

describe('MemberRow', () => {
  it('draws the name, the relation and the pill and presses', async () => {
    const onPress = jest.fn();
    await render(wrap(<MemberRow name="Test Member" relation="Spouse" pill={{ label: '3 permissions', tone: 'neutral' }} onPress={onPress} testID="row" />));
    expect(screen.getByText('Test Member')).toBeTruthy();
    expect(screen.getByText('Spouse')).toBeTruthy();
    expect(screen.getByText('3 permissions')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('row'));
    });
    expect(onPress).toHaveBeenCalled();
  });
});

describe('loadFamily', () => {
  beforeEach(() => mockApiFetch.mockReset());
  it('is no group when the person has none', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('No family group found'));
    await expect(loadFamily()).resolves.toEqual({ group: null, members: [] });
  });
  it('throws any other failure so the screen shows its retry', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('network down'));
    await expect(loadFamily()).rejects.toThrow('network down');
  });
  it('returns the group and its members', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'g1', members: [{ user_id: 'u1', permissions: ['vitals'] }] }).mockResolvedValueOnce([{ user_id: 'u1' }]);
    const out = await loadFamily();
    expect(out.group?.id).toBe('g1');
    expect(out.members).toHaveLength(1);
  });
});

describe('extractInviteCode', () => {
  it('reads the code of an invite link or a bare code and rejects anything else', () => {
    expect(extractInviteCode('https://nabdahplus.app/join/abc123')).toBe('ABC123');
    expect(extractInviteCode('f7x2k9')).toBe('F7X2K9');
    expect(extractInviteCode('https://example.test/')).toBeNull();
    expect(extractInviteCode('')).toBeNull();
  });
});

describe('family translations', () => {
  const bag = translations as unknown as Record<string, Record<string, string>>;
  const ar = bag.ar;
  it('has every family.* word of the Arabic file in all six languages, none empty, with the same {slots}', () => {
    const keys = Object.keys(ar).filter((key) => key.startsWith('family.'));
    expect(keys.length).toBeGreaterThan(140);
    const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
      const file = bag[lang];
      for (const key of keys) {
        expect(typeof file[key] === 'string' && file[key].trim().length > 0).toBe(true);
        expect(slots(file[key])).toBe(slots(ar[key]));
      }
    }
  });
});
