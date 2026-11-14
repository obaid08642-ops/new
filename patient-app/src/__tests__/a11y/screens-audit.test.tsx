import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import InsuranceHubScreen from '../../../app/insurance';
import RxOrderScreen from '../../../app/pharmacy/rx-order';
import { FamilyMemberView } from '../../components/family/FamilyMemberView';
import { auditPressables } from './audit';

/**
 * PT-40: three of the most used screens, rendered with TEST answers, audited for every pressable element: role, name, 44pt.
 * `checked` guards against an audit that looks at nothing.
 */
const mockApiFetch = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, []); },
}));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../hooks/useGuestGuard', () => ({ useGuestGuard: () => ({ isGuest: false, requireAuth: jest.fn() }) }));
jest.mock('../../hooks/useUploadsEnabled', () => ({ useUploadsEnabled: () => true }));
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), BASE_URL: 'https://api.example.test/api/v1', newIdempotencyKey: () => 'test-key' }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/users/me/insurance') return { provider: 'TEST insurer', policy_number: 'TEST-123', verified: false };
    if (path === '/insurance/requests/my') return [];
    if (path === '/config') return {};
    if (path.startsWith('/family/member-records/')) return { vitals: [], meds: [], next_appointment: null };
    return [];
  });
});

describe('pressables of real screens', () => {
  it('insurance hub, policy tab', async () => {
    mockParams = { tab: 'policy' };
    await render(wrap(<InsuranceHubScreen />));
    await screen.findByTestId('policy-card');
    const { checked, findings } = auditPressables(screen.toJSON() as never);
    expect(checked).toBeGreaterThan(3);
    expect(findings).toEqual([]);
  });

  it('family member, health tab', async () => {
    mockParams = { id: 'member-1', name: 'Test Member', relation: 'child' };
    await render(wrap(<FamilyMemberView />));
    await screen.findByTestId('member-book');
    const { checked, findings } = auditPressables(screen.toJSON() as never);
    expect(checked).toBeGreaterThan(3);
    expect(findings).toEqual([]);
  });

  it('pharmacy order with a prescription, photo way', async () => {
    mockParams = { via: 'photo' };
    await render(wrap(<RxOrderScreen />));
    await screen.findByTestId('scan-save');
    const { checked, findings } = auditPressables(screen.toJSON() as never);
    expect(checked).toBeGreaterThan(3);
    expect(findings).toEqual([]);
  });
});

describe('the audit itself', () => {
  it('flags a pressable with no role, no name and a small target', async () => {
    await render(<Pressable onPress={() => undefined} testID="bad" style={{ height: 20 }}><Text>{''}</Text></Pressable>);
    const { findings } = auditPressables(screen.toJSON() as never);
    expect(findings.map((f) => f.problem).sort()).toEqual(['name', 'role', 'size']);
  });
});
