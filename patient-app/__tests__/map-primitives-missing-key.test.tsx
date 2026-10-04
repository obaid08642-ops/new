import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Q69: an Android build without a Google Maps key must not mount the native map
// (the SDK aborts the screen); it shows a "map unavailable" panel instead.
// Boundaries only: the native map module, the build config and the app context.
jest.mock('react-native-maps', () => {
  const { Text: T } = require('react-native');
  const R = require('react');
  class MockMap extends R.Component { animateToRegion() {} render() { return R.createElement(T, { testID: 'native-map' }, 'native map'); } }
  return { __esModule: true, default: MockMap, Marker: () => null, PROVIDER_DEFAULT: undefined };
});
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ lang: 'en' }) }));

function load(apiKey: string, os: 'android' | 'ios') {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { android: { config: { googleMaps: { apiKey } } } } } }));
  const RN = require('react-native');
  RN.Platform.OS = os;
  return require('../src/components/MapPrimitives.native').default;
}

describe('MapPrimitives on a build without a Google Maps key (Q69)', () => {
  it('Android without a key shows the unavailable panel, translated', async () => {
    const MapView = load('', 'android');
    await render(<MapView style={{ flex: 1 }}><Text>marker</Text></MapView>);
    expect(screen.getByTestId('map-unavailable')).toBeTruthy();
    expect(screen.getByText('The map is not available right now')).toBeTruthy();
    expect(screen.queryByTestId('native-map')).toBeNull();
  });

  it('a ref call on the unavailable panel does not throw', async () => {
    const MapView = load('', 'android');
    const ref = React.createRef<any>();
    await render(<MapView ref={ref} />);
    expect(() => ref.current.animateToRegion({ latitude: 24.7, longitude: 46.7, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 500)).not.toThrow();
  });

  it('Android with a key, and iOS, mount the native map', async () => {
    let MapView = load('synthetic-test-key', 'android');
    await render(<MapView />);
    expect(screen.getByTestId('native-map')).toBeTruthy();
    MapView = load('', 'ios');
    await render(<MapView />);
    expect(screen.getByTestId('native-map')).toBeTruthy();
  });
});
