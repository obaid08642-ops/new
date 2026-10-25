import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AboutView } from '../../components/account/AboutView';
import RefundRedirect from '../../../app/settings/refund-policy';
import TelehealthRedirect from '../../../app/settings/telehealth-consent';
import { message } from '../../components/screen/ScreenKit';

/**
 * Settings merge (OD-6, merge map section 3): About and legal shows the refund policy and the telehealth consent as
 * sections (TEST texts), `?doc=` opens one, and the two old routes redirect to it keeping that anchor.
 */

let mockParams: Record<string, string> = { tab: 'legal' };
const mockRedirect = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  Redirect: (props: { href: unknown }) => {
    mockRedirect(props.href);
    return null;
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'http://test', apiFetch: jest.fn(() => Promise.resolve([])) }));

const k = (key: string) => message('en', key);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;
const answer = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) } as Response);

describe('About and legal', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it('lists both documents as sections and opens one on its row', async () => {
    const fetchMock = jest.fn(() => answer({ content: 'Test refund text' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await render(wrap(<AboutView />));
    expect(screen.getByText(k('legal.refund.title'))).toBeTruthy();
    expect(screen.getByText(k('legal.telehealth.title'))).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('legal-refund_policy-toggle'));
    expect(await screen.findByText('Test refund text')).toBeTruthy();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/legal\/policy\/refund_policy\?lang=en$/);
  });

  it('opens the consent section from the deep-link anchor', async () => {
    mockParams = { tab: 'legal', doc: 'telehealth_consent' };
    const fetchMock = jest.fn(() => answer({ content: 'Test consent text' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await render(wrap(<AboutView />));
    expect(await screen.findByText('Test consent text')).toBeTruthy();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/legal\/policy\/telehealth_consent/);
    mockParams = { tab: 'legal' };
  });

  it('redirects the old routes to the legal tab with the document anchor', async () => {
    await render(<RefundRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith({ pathname: '/settings/about', params: { tab: 'legal', doc: 'refund_policy' } });
    await render(<TelehealthRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith({ pathname: '/settings/about', params: { tab: 'legal', doc: 'telehealth_consent' } });
  });
});
