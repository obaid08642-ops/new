/**
 * P15.5 — verification:
 *  1. a thrown render error shows the fallback, NOT a white screen;
 *  2. the fallback offers both "try again" and "contact support";
 *  3. Sentry receives the error, with the release attached.
 *
 * Sentry is mocked, so no event leaves the process.
 * BLOCKED: Sentry DSN is an owner secret — the live send path is not exercised here.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

const mockCaptureException = jest.fn();
const mockInit = jest.fn();
const mockSetUser = jest.fn();
const mockSetTag = jest.fn();

jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: (...args: unknown[]) => mockInit(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
  setTag: (...args: unknown[]) => mockSetTag(...args),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { name: 'Nabd Plus Provider', version: '1.4.2', ios: { buildNumber: '77' } },
    executionEnvironment: 'bare',
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));

import { ErrorBoundary, ErrorFallback, SUPPORT_URL } from '../ErrorBoundary';
import {
  initProviderSentry,
  currentRelease,
  reportError,
  resolveRelease,
  setUserContext,
  __resetSentryForTests,
} from '../../utils/sentry';

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('kaboom: render exploded');
  return <Text>screen content</Text>;
}

/** React logs every caught boundary error; keep the suite output readable. */
function withSilencedBoundaryLog<T>(fn: () => T): T {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

beforeEach(() => {
  mockCaptureException.mockClear();
  mockInit.mockClear();
  mockSetUser.mockClear();
  mockSetTag.mockClear();
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  __resetSentryForTests();
});

describe('P15.5 nothing crashes to a blank screen', () => {
  it('a thrown render error shows the fallback, not a white screen', async () => {
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="DoctorHome">
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );

    expect(r.getByTestId('error-fallback')).toBeTruthy();
    expect(r.getByTestId('error-fallback-title')).toBeTruthy();
    expect(r.getByTestId('error-fallback-detail')).toHaveTextContent(/kaboom/);
    // The crashed subtree is gone: this is a fallback, not a half-rendered screen.
    expect(r.queryByText('screen content')).toBeNull();
  });

  it('names the screen that broke, so the report is locatable', async () => {
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="FacilityDashboard">
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );
    expect(r.getByText(/FacilityDashboard/)).toBeTruthy();
  });

  it('offers "contact support" and defaults to the support URL', async () => {
    const Linking = require('react-native').Linking;
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="S">
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );
    fireEvent.press(r.getByTestId('error-fallback-support'));
    expect(openURL).toHaveBeenCalledWith(SUPPORT_URL);
    openURL.mockRestore();
  });

  it('routes "contact support" to the in-app handler when one is supplied', async () => {
    const onContactSupport = jest.fn();
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="S" onContactSupport={onContactSupport}>
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );
    fireEvent.press(r.getByTestId('error-fallback-support'));
    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });

  it('a screen that renders cleanly shows no fallback', async () => {
    const r = await render(
      <ErrorBoundary screenName="S">
        <View><Text>fine</Text></View>
      </ErrorBoundary>,
    );
    expect(r.getByText('fine')).toBeTruthy();
    expect(r.queryByTestId('error-fallback')).toBeNull();
  });

  it('the fallback is bilingual', async () => {
    const noop = () => {};
    const r = await render(
      <ErrorFallback error={new Error('x')} onRetry={noop} onContactSupport={noop} lang="ar" />,
    );
    expect(r.getByTestId('error-fallback-retry')).toHaveTextContent('إعادة المحاولة');
    expect(r.getByTestId('error-fallback-support')).toHaveTextContent('التواصل مع الدعم');
    await r.rerender(<ErrorFallback error={new Error('x')} onRetry={noop} onContactSupport={noop} lang="en" />);
    expect(r.getByTestId('error-fallback-retry')).toHaveTextContent('Try again');
    expect(r.getByTestId('error-fallback-support')).toHaveTextContent('Contact support');
  });

  it('the fallback renders without a SafeAreaProvider (the root boundary sits above one)', async () => {
    const noop = () => {};
    // No SafeAreaProvider wrapper here on purpose: the fallback must not throw.
    const r = await render(<ErrorFallback error={new Error('x')} onRetry={noop} onContactSupport={noop} />);
    expect(r.getByTestId('error-fallback')).toBeTruthy();
  });
});

describe('P15.5 Sentry receives the crash with the release', () => {
  it('a caught render error is reported, tagged with the screen', async () => {
    await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="DoctorHome">
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = mockCaptureException.mock.calls[0] as [Error, { extra?: { screen?: string } }];
    expect(err.message).toBe('kaboom: render exploded');
    expect(ctx?.extra?.screen).toBe('DoctorHome');
  });

  it('resolves the shared release contract: provider-app@{version}+{build}[+dev]', () => {
    // The expo-constants mock above reports version 1.4.2 + iOS build 77; jest
    // runs with __DEV__ true, so the dev suffix applies.
    expect(resolveRelease()).toBe('provider-app@1.4.2+77+dev');
    expect(resolveRelease(undefined, { dev: false })).toBe('provider-app@1.4.2+77');
    // The app id is the contract constant, never the config display name…
    expect(resolveRelease({ name: 'x', version: '2.0.0' }, { dev: false })).toBe('provider-app@2.0.0');
    // …and the build comes from either platform slot.
    expect(resolveRelease({ name: 'x', version: '2.0.0', android: { versionCode: 9 } }, { dev: false })).toBe(
      'provider-app@2.0.0+9',
    );
  });

  it('reads SENTRY_RELEASE first, verbatim, before the Expo config fallback', () => {
    expect(
      resolveRelease({ name: 'x', version: '2.0.0' }, { env: { SENTRY_RELEASE: 'provider-app@9.9.9+1' }, dev: false }),
    ).toBe('provider-app@9.9.9+1');
    // A blank env value is not a release: falls through to the config.
    expect(resolveRelease({ version: '2.0.0' }, { env: { SENTRY_RELEASE: '  ' }, dev: false })).toBe(
      'provider-app@2.0.0',
    );
  });

  it('passes the release to Sentry.init so every event is tied to a build', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
    initProviderSentry();
    expect(mockInit).toHaveBeenCalledTimes(1);
    const opts = mockInit.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.dsn).toBe('https://public@example.ingest.sentry.io/1');
    expect(opts.release).toBe('provider-app@1.4.2+77+dev');
    expect(currentRelease()).toBe('provider-app@1.4.2+77+dev');
  });

  it('stays disabled without a DSN rather than crashing at startup', async () => {
    initProviderSentry();
    expect(mockInit).not.toHaveBeenCalled();
    expect(currentRelease()).toBeNull();
    // …and the boundary still works.
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="S">
          <Boom shouldThrow />
        </ErrorBoundary>,
      ),
    );
    expect(r.getByTestId('error-fallback')).toBeTruthy();
  });

  it('reportError never throws, even if Sentry does', () => {
    mockCaptureException.mockImplementationOnce(() => {
      throw new Error('sentry exploded');
    });
    expect(() => reportError(new Error('x'), { screen: 'S' })).not.toThrow();
  });

  it('tags subsequent events with the provider identity', () => {
    setUserContext({ id: 'prov-1', providerType: 'doctor' });
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'prov-1' });
    expect(mockSetTag).toHaveBeenCalledWith('provider_type', 'doctor');
  });
});

/**
 * Recovery ("try again" really remounts the children) is asserted LAST on purpose.
 *
 * Once an error boundary in a test file has both caught *and recovered*, every later
 * `render()` in that same file returns a null tree — an RTL 14 / React 19 interaction,
 * not something this component controls. Keeping the only recovery test at the end of
 * the file means no other assertion depends on a render that follows it.
 */
describe('P15.5 recovery via "try again"', () => {
  it('clears the error and re-renders the children once the cause is fixed', async () => {
    const onRetry = jest.fn();
    let broken = true;
    const r = await withSilencedBoundaryLog(() =>
      render(
        <ErrorBoundary screenName="S" onRetry={onRetry}>
          <Boom shouldThrow={broken} />
        </ErrorBoundary>,
      ),
    );
    expect(r.getByTestId('error-fallback')).toBeTruthy();

    // The failure was transient — the underlying condition is fixed, then retried.
    broken = false;
    fireEvent.press(r.getByTestId('error-fallback-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await r.rerender(
      <ErrorBoundary screenName="S" onRetry={onRetry}>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(r.getByText('screen content')).toBeTruthy();
    expect(r.queryByTestId('error-fallback')).toBeNull();
  });
});