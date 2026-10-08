// Native modules with no JS fallback under Jest. Mocked only so shared UI files can be imported in component
// tests; behaviour that depends on them is covered by browser (react-native-web) tests, not here.
jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: (p) => React.createElement('WebView', p) };
});
