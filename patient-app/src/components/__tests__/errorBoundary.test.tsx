/**
 * 15.5 — the gate check: a thrown render error shows the fallback, not a white
 * screen, and the crash reaches Sentry WITH the release attached.
 *
 * The real Sentry DSN is an owner secret, so the SDK is injected as a mock. What
 * is under test is everything this repo owns: the fallback UI, the two required
 * actions, the release derivation, and the release travelling with every event.
 */
jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'ar', languageTag: 'ar-SA', isRTL: true, regionCode: 'SA' }],
  findBestAvailableLanguage: () => undefined,
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
}));

import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../../context/AppContext';
import { ErrorBoundary, ScreenErrorBoundary, ScreenFallback, FALLBACK_COPY, newErrorId } from '../ErrorBoundary';
import {
  __resetCrashReporting,
  captureException,
  getCrashState,
  getRelease,
  initCrashReporting,
  resolveRelease,
  type CrashReporter,
} from '../../services/monitoring/crash';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function fakeSentry(): CrashReporter & { init: jest.Mock; captured: Array<[unknown, any]> } {
  const captured: Array<[unknown, any]> = [];
  return {
    init: jest.fn(),
    captureException: jest.fn((error: unknown, hint: any) => { captured.push([error, hint]); }),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    setTag: jest.fn(),
    setUser: jest.fn(),
    setContext: jest.fn(),
    captured,
  } as any;
}

let sentry = fakeSentry();

function withProviders(node: React.ReactNode) {
  return (
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AppProvider>{node}</AppProvider>
    </SafeAreaProvider>
  );
}

function Boom({ message = 'render exploded' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

beforeEach(() => {
  __resetCrashReporting();
  sentry = fakeSentry();
  initCrashReporting({ dsn: 'https://public@sentry.test/1', reporter: sentry, release: 'app@1.2.3(45)' });
});

afterEach(() => {
  __resetCrashReporting();
});

describe('15.5 · a thrown render error shows the fallback, not a white screen', () => {
  it('the root boundary replaces the crashed tree with the recovery UI', async () => {
    const view = await render(
      withProviders(
        <ErrorBoundary scope="root">
          <Boom />
        </ErrorBoundary>,
      ),
    );

    expect(view.getByTestId('screen-error-fallback')).toBeTruthy();
    expect(view.getByText(FALLBACK_COPY.ar.title)).toBeTruthy();
    // The screen the user was on is gone, not blank: there is real content.
    expect(view.getAllByText(FALLBACK_COPY.ar.tryAgain)).toHaveLength(1);
    expect(view.getAllByText(FALLBACK_COPY.ar.contact)).toHaveLength(1);
  });

  it('offers BOTH required actions: try again and contact support', async () => {
    const view = await render(
      withProviders(
        <ErrorBoundary scope="root">
          <Boom />
        </ErrorBoundary>,
      ),
    );

    const retry = view.getByTestId('screen-error-retry');
    const contact = view.getByTestId('screen-error-contact');
    expect(retry).toBeTruthy();
    expect(contact).toBeTruthy();
    expect(retry.props.onPress).toBeInstanceOf(Function);
    expect(contact.props.onPress).toBeInstanceOf(Function);
  });

  it('"try again" re-renders the screen, and the screen then works', async () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('first render fails');
      return <Text testID="recovered">screen content</Text>;
    }

    const view = await render(
      withProviders(
        <ErrorBoundary scope="root">
          <Flaky />
        </ErrorBoundary>,
      ),
    );
    expect(view.getByTestId('screen-error-fallback')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(view.getByTestId('screen-error-retry'));

    await waitFor(() => expect(view.getByTestId('recovered')).toBeTruthy());
    expect(view.queryByTestId('screen-error-fallback')).toBeNull();
  });

  it('shows a quotable error id the user can give to support', async () => {
    const view = await render(
      withProviders(
        <ErrorBoundary scope="root">
          <Boom />
        </ErrorBoundary>,
      ),
    );
    const id = view.getByTestId('screen-error-id');
    expect(id.props.children.join('')).toMatch(/[A-Z0-9]{6}/);
    expect(newErrorId()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('renders the English copy when the app language is English', async () => {
    const view = await render(<ScreenFallback errorId="ABC123" locale="en" onRetry={() => undefined} />);
    expect(view.getByText(FALLBACK_COPY.en.title)).toBeTruthy();
    expect(view.getByText(FALLBACK_COPY.en.tryAgain)).toBeTruthy();
    expect(view.getByText(FALLBACK_COPY.en.contact)).toBeTruthy();
  });

  it('the per-screen boundary expo-router uses reports and offers the same retry', async () => {
    const retry = jest.fn(async () => undefined);
    const view = await render(withProviders(<ScreenErrorBoundary error={new Error('route blew up')} retry={retry} />));

    expect(view.getByTestId('screen-error-fallback')).toBeTruthy();
    fireEvent.press(view.getByTestId('screen-error-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('15.5 · Sentry receives the error WITH the release', () => {
  it('the release is initialised on the SDK', () => {
    expect(sentry.init).toHaveBeenCalledTimes(1);
    const options = sentry.init.mock.calls[0][0] as any;
    expect(options.release).toBe('app@1.2.3(45)');
    expect(options.dsn).toBe('https://public@sentry.test/1');
  });

  it('beforeSend stamps the release on every event, so a stack trace is resolvable', () => {
    const options = sentry.init.mock.calls[0][0] as any;
    const event = options.beforeSend({ message: 'x' });
    expect(event.release).toBe('app@1.2.3(45)');
    expect(event.tags.release).toBe('app@1.2.3(45)');
    // An explicit release set elsewhere is never overwritten.
    const pinned = options.beforeSend({ message: 'x', release: 'app@0.0.1(1)' });
    expect(pinned.release).toBe('app@0.0.1(1)');
  });

  it('a render crash is captured with the release on the payload', async () => {
    await render(
      withProviders(
        <ErrorBoundary scope="screen">
          <Boom message="screen crashed" />
        </ErrorBoundary>,
      ),
    );

    await waitFor(() => expect(sentry.captureException).toHaveBeenCalledTimes(1));
    const [error, hint] = sentry.captured[0];
    expect((error as Error).message).toBe('screen crashed');
    expect(hint.tags.release).toBe('app@1.2.3(45)');
    expect(hint.extra.release).toBe('app@1.2.3(45)');
    expect(hint.extra.scope).toBe('screen');
    expect(typeof hint.extra.errorId).toBe('string');
    expect(sentry.setTag).toHaveBeenCalledWith('release', 'app@1.2.3(45)');
  });

  it('the per-screen boundary captures once, not on every re-render', async () => {
    const view = await render(withProviders(<ScreenErrorBoundary error={new Error('boom')} retry={async () => undefined} />));
    fireEvent.press(view.getByTestId('screen-error-retry'));
    await waitFor(() => expect(sentry.captureException).toHaveBeenCalledTimes(1));
  });

  it('captureException carries the release outside a boundary too', () => {
    captureException(new Error('manual report'), { scope: 'test' });
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const [, hint] = sentry.captured[0];
    expect(hint.tags.release).toBe('app@1.2.3(45)');
    expect(hint.extra.scope).toBe('test');
  });
});

describe('15.5 · the release is derived from the shipped version and build', () => {
  it('is app@version(build)', () => {
    expect(resolveRelease({ version: '1.0.0', build: '7', explicit: null })).toBe('app@1.0.0(7)');
    expect(resolveRelease({ version: '2.3.4', build: 42, explicit: null })).toBe('app@2.3.4(42)');
  });

  it('falls back to `source` when the native build number is unavailable', () => {
    expect(resolveRelease({ version: '1.0.0', build: null, explicit: null })).toBe('app@1.0.0(source)');
  });

  it('an explicit release (CI) wins over the derived one', () => {
    expect(resolveRelease({ version: '1.0.0', build: '7', explicit: 'app@ci.42(9)' })).toBe('app@ci.42(9)');
  });

  it('getRelease reports what init actually used', () => {
    expect(getRelease()).toBe('app@1.2.3(45)');
    expect(getCrashState()).toMatchObject({
      initialised: true,
      enabled: true,
      release: 'app@1.2.3(45)',
      environment: expect.any(String),
    });
  });
});

describe('15.5 · with no DSN the app still starts and reporting is a no-op', () => {
  beforeEach(() => {
    __resetCrashReporting();
    // A fresh SDK double: the outer beforeEach already called init once, so the
    // outer mock's call count would otherwise leak into this assertion.
    sentry = fakeSentry();
    initCrashReporting({ dsn: '', reporter: sentry });
  });

  it('initialises but does not enable reporting', () => {
    expect(getCrashState()).toMatchObject({ initialised: true, enabled: false, dsn: '' });
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('captureException is silent rather than throwing', () => {
    expect(() => captureException(new Error('x'))).not.toThrow();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('the boundary still shows the fallback with no DSN configured', async () => {
    const view = await render(
      withProviders(
        <ErrorBoundary scope="root">
          <Boom />
        </ErrorBoundary>,
      ),
    );
    expect(view.getByTestId('screen-error-fallback')).toBeTruthy();
    expect(view.getByTestId('screen-error-retry')).toBeTruthy();
    expect(view.getByTestId('screen-error-contact')).toBeTruthy();
  });
});

describe('15.5 · a failing SDK cannot stop the app from starting', () => {
  it('an init that throws disables reporting instead of propagating', () => {
    __resetCrashReporting();
    sentry = fakeSentry();
    const exploding: CrashReporter = {
      init: () => { throw new Error('sdk missing native module'); },
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      setTag: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
    };
    expect(() => initCrashReporting({ dsn: 'https://x@y/1', reporter: exploding })).not.toThrow();
    expect(getCrashState().enabled).toBe(false);
    expect(() => captureException(new Error('x'))).not.toThrow();
  });
});

describe('15.5 · the boundaries are actually wired into the app', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const appRoot = path.resolve(__dirname, '../../..');
  const layout = fs.readFileSync(path.join(appRoot, 'app/_layout.tsx'), 'utf8');

  it('the root layout mounts a boundary around the provider tree', () => {
    expect(layout).toContain('<ErrorBoundary scope="root">');
    // It wraps the providers, not just the Stack, so a provider crash is caught too.
    const boundaryAt = layout.indexOf('<ErrorBoundary scope="root">');
    const providerAt = layout.indexOf('<Provider store={store}>');
    expect(boundaryAt).toBeGreaterThan(-1);
    expect(boundaryAt).toBeLessThan(providerAt);
  });

  it('the root layout registers a per-screen boundary for every route beneath it', () => {
    expect(layout).toMatch(/export const unstable_settings\s*=\s*\{\s*screenErrorBoundary: ScreenErrorBoundary\s*,?\s*\}/s);
  });

  it('crash reporting is started at startup with the release', () => {
    expect(layout).toContain('initSentry()');
  });

  it('the app still wraps the root in Sentry.wrap when a DSN is available', () => {
    expect(layout).toContain('Sentry.wrap(RootLayout)');
  });

  it('no DSN is committed: it is read from the environment', () => {
    expect(layout).not.toMatch(/sentry\.io\/[0-9]/);
    const appJson = fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8');
    expect(appJson).not.toMatch(/sentry\.io\/[0-9]/);
  });

  it('the Sentry config plugin is present, so a build uploads source maps', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8'));
    const plugins: unknown[] = appJson.expo.plugins ?? [];
    expect(plugins).toContain('@sentry/react-native');
  });
});
