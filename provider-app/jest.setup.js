// Native modules with no JS fallback under Jest. Mocked only so shared UI files can be imported in component
// tests; behaviour that depends on them is covered by browser (react-native-web) tests, not here.
jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: (p) => React.createElement('WebView', p) };
});

// MapLibre is a native view; tests render the screens around it, so its components are plain views here.
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const plain = (name) => { const C = ({ children, ...props }) => React.createElement(View, { ...props, testID: props.testID || name }, children); C.displayName = name; return C; };
  return { Map: plain('MLMap'), Marker: plain('MLMarker'), GeoJSONSource: plain('MLGeoJSONSource'), Layer: plain('MLLayer'), Camera: React.forwardRef((_p, ref) => { React.useImperativeHandle(ref, () => ({ easeTo: jest.fn(), jumpTo: jest.fn(), flyTo: jest.fn() })); return null; }) };
});
