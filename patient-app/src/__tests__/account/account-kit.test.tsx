import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StarRating, ToggleRow, useFlags } from '../../components/account/AccountKit';
import { AddressBookView } from '../../components/account/AddressBookView';
import { pharmacyPolicyLines, policyLines } from '../../components/account/PolicyText';
import { ChatThread } from '../../components/family/ChatThread';
import { message } from '../../components/screen/ScreenKit';
import { translations } from '../../i18n';

/**
 * Batch 12: the shared pieces of the settings, account and support screens. Every value is a TEST value. Proved: a switch row reports
 * its change; a flag that fails to save goes back and says so; the stars report the one pressed; the address book (not in pick mode)
 * makes the chosen address the default and puts it back when the save fails; the policy sentences come from the server's numbers and
 * a missing number draws nothing; the chat template shows the quick replies and the attach button it is given; every new key has all
 * six translations with the same slots.
 */

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};

beforeEach(() => {
  apiFetch.mockReset();
  mockParams.current = {};
});

describe('ToggleRow and StarRating', () => {
  it('reports the new value of a switch and the star pressed', async () => {
    const onChange = jest.fn();
    const onStars = jest.fn();
    await render(wrap(<><ToggleRow label="Sound" value={false} onChange={onChange} /><StarRating value={2} onChange={onStars} label="Rating" /></>));
    await tap(screen.getByLabelText('Sound'));
    expect(onChange).toHaveBeenCalledWith(true);
    await tap(screen.getByLabelText(k('account.stars', { n: 4 })));
    expect(onStars).toHaveBeenCalledWith(4);
  });
});

describe('useFlags', () => {
  const Probe = () => {
    const { flags, toggle, failed } = useFlags('/x', { a: true }, 'test');
    return <ToggleRow label={failed ? 'failed' : 'A'} value={flags.a} onChange={(v) => void toggle('a', v)} />;
  };
  it('sends only the changed flag and puts the switch back when the save fails', async () => {
    apiFetch.mockImplementation(async (_path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') throw new Error('server_error');
      return { a: true };
    });
    await render(wrap(<Probe />));
    await tap(await screen.findByLabelText('A'));
    await screen.findByLabelText('failed');
    const patch = apiFetch.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ a: false });
    expect(screen.getByLabelText('failed').props.accessibilityState.checked).toBe(true);
  });
});

describe('address book', () => {
  const list = [
    { id: 'a1', label: 'Test home', street: 'Test street', lat: 24.7, lng: 46.6, is_default: true },
    { id: 'a2', label: 'Test work', street: 'Work street', lat: 24.8, lng: 46.7 },
  ];
  it('makes the chosen address the default, and goes back when the save fails', async () => {
    apiFetch.mockImplementation(async (_path: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') throw new Error('server_error');
      return list;
    });
    await render(wrap(<AddressBookView />));
    await tap(await screen.findByLabelText(new RegExp('Test work')));
    await screen.findByText(k('account.defaultFailed'));
    const patch = apiFetch.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patch[0]).toBe('/users/me/addresses/a2');
    expect(JSON.parse(patch[1].body)).toEqual({ is_default: true });
    await waitFor(() => expect(screen.getByLabelText(new RegExp('Test home')).props.accessibilityState.checked).toBe(true));
  });
});

describe('policyLines', () => {
  it('writes only the sentences whose numbers the server sent', () => {
    const lines = policyLines({ cancellation_policy: { full_hours: 24, full_refund: true, late_fee_percent: 25 } }, 'cancellation', k);
    expect(lines).toEqual([k('set.legal.cancelFull', { hours: 24 }), k('set.legal.cancelLate', { percent: 25 })]);
    expect(policyLines({ returns_policy: {} }, 'returns', k)).toEqual([]);
    expect(policyLines(null, 'cancellation', k)).toEqual([]);
  });
});

describe('pharmacyPolicyLines', () => {
  it('writes the pharmacy rules from the server numbers only', () => {
    const lines = pharmacyPolicyLines(
      { cancellation_policy: { full_hours: 24, pharmacy_prep_cancellable: false }, returns_policy: { unused_days: 7, wallet_refund_days_min: 2, wallet_refund_days_max: 5 } },
      k,
    );
    expect(lines).toEqual([k('set.legal.cancelPharmacy'), k('set.legal.returnsDays', { days: 7 }), k('set.legal.refundDays', { min: 2, max: 5 })]);
    expect(pharmacyPolicyLines({ cancellation_policy: { full_hours: 24 } }, k)).toEqual([]);
    expect(pharmacyPolicyLines(null, k)).toEqual([]);
  });
});

describe('ChatThread extras', () => {
  it('draws the quick replies and the attach button it is given', async () => {
    const reply = jest.fn();
    const attach = jest.fn();
    await render(wrap(<ChatThread title="T" status="ready" onRetry={jest.fn()} messages={[]} empty={{ title: 'E', body: 'B' }} composer={{ value: '', onChange: jest.fn(), onSend: jest.fn(), sending: false, placeholder: 'P', sendLabel: 'Send' }} quickReplies={[{ label: 'Quick', onPress: reply }]} attach={{ label: 'Photo', onPress: attach, busy: false }} />));
    await tap(screen.getByLabelText('Quick'));
    await tap(screen.getByLabelText('Photo'));
    expect(reply).toHaveBeenCalled();
    expect(attach).toHaveBeenCalled();
  });
});

describe('translations', () => {
  it('has every Batch 12 key in the six languages with the same slots', () => {
    const slots = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
    const all = translations as unknown as Record<string, Record<string, string>>;
    const keys = Object.keys(all.en).filter((key) => /^(set|account|map|picker|returns|reviews|support)\./.test(key));
    expect(keys.length).toBeGreaterThan(300);
    for (const key of keys) {
      for (const lang of ['ar', 'ur', 'hi', 'bn', 'fil']) {
        const value = all[lang]?.[key];
        expect(typeof value === 'string' && value.trim() !== '').toBe(true);
        expect(slots(value)).toBe(slots(all.en[key]));
      }
    }
  });
});
