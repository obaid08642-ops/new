import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LegalDocument, NoticePage, legalBack, parseLegal } from '../../components/legal/LegalKit';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 13: the legal and notice template. Every text is a TEST value. What is proved: the policy text is split into
 * headings, paragraphs and bullets; the document asks the legal service for its key and language, shows the policy and
 * its version, shows the failure state with a working retry (also when the answer has no text), and back works with
 * and without a history (signed out: the sign-in); the notice page fires its two actions.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const answer = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) } as Response);

describe('parseLegal', () => {
  it('splits headings, paragraphs and bullets', () => {
    const blocks = parseLegal('# Title\n\nFirst line\nsecond line\n\n• One\n- Two\n\nEnd');
    expect(blocks).toEqual([
      { kind: 'heading', text: 'Title' },
      { kind: 'paragraph', text: 'First line second line' },
      { kind: 'bullet', text: 'One' },
      { kind: 'bullet', text: 'Two' },
      { kind: 'paragraph', text: 'End' },
    ]);
  });
});

describe('LegalDocument', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.clearAllMocks();
  });

  it('asks for its policy in the language and draws the text with its version', async () => {
    const fetchMock = jest.fn(() => answer({ content: 'Test policy text.\n\n• Test point', version: '2', effective_date: '2026-01-05T00:00:00Z' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await render(wrap(<LegalDocument policyKey="patient_terms" title="Terms" />));
    expect(await screen.findByText('Test policy text.')).toBeTruthy();
    expect(screen.getByText('Test point')).toBeTruthy();
    expect(screen.getByText(/Version 2/)).toBeTruthy();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/legal\/policy\/patient_terms\?lang=en$/);
  });

  it('shows the failure state and retries, also when the answer has no text', async () => {
    const fetchMock = jest.fn().mockImplementationOnce(() => answer({})).mockImplementationOnce(() => answer({ content: 'Back again' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await render(wrap(<LegalDocument policyKey="privacy_policy" title="Privacy" />));
    expect(await screen.findByText(k('consult.error.title'))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText(k('consult.retry')));
    });
    await waitFor(() => expect(screen.getByText('Back again')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the failure state when the service cannot be reached', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await render(wrap(<LegalDocument policyKey="privacy_policy" title="Privacy" />));
    expect(await screen.findByText(k('consult.error.title'))).toBeTruthy();
  });
});

describe('legalBack and NoticePage', () => {
  it('goes back with a history and to the sign-in without one', () => {
    mockRouter.canGoBack.mockReturnValueOnce(true);
    legalBack();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    mockRouter.canGoBack.mockReturnValueOnce(false);
    legalBack();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('fires both actions of the notice', async () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    await render(wrap(<NoticePage headline="Head" body="Body" primary={{ label: 'Go', onPress: onPrimary }} secondary={{ label: 'Out', onPress: onSecondary }} />));
    fireEvent.press(screen.getByLabelText('Go'));
    fireEvent.press(screen.getByLabelText('Out'));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
