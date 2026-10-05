// Native modules with no JS fallback under Jest. Mocked only so shared UI files can be imported in component
// tests; behaviour that depends on them is covered by browser (react-native-web) tests, not here.
jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: (p) => React.createElement('WebView', p) };
});

// P15.5: @sentry/react-native publishes ESM that the jest-expo transform ignore-pattern
// does not cover, so importing it from a component (ErrorBoundary -> utils/sentry) throws
// "Unexpected token 'export'" before any test body runs. A no-op module keeps the import
// graph loadable; tests that assert on reporting override this with their own factory.
jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  captureEvent: () => {},
  addBreadcrumb: () => {},
  setUser: () => {},
  setTag: () => {},
  setTags: () => {},
  setExtra: () => {},
  setExtras: () => {},
  setContext: () => {},
  withScope: (cb) => cb && cb({ setTag: () => {}, setExtra: () => {}, setExtras: () => {} }),
  lastEventId: () => undefined,
  flush: async () => true,
  close: async () => true,
}));