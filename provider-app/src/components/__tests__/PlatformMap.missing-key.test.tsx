import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TR } from '../../constants';

// Q69: an Android build without a Google Maps key must not mount the native map
// (the SDK aborts the screen); doctor/pharmacy registration and the doctor
// location screen show a "map unavailable" panel instead.
jest.mock('react-native-maps', () => {
  const { Text } = require('react-native');
  const R = require('react');
  class MockMap extends R.Component { animateToRegion() {} render() { return R.createElement(Text, { testID: 'native-map' }, 'native map'); } }
  return { __esModule: true, default: MockMap, Marker: () => null, Circle: () => null };
});
jest.mock('../../context', () => {
  const { TR: tr } = jest.requireActual('../../constants');
  return { useLang: () => ({ lang: 'en', t: (k: string) => tr.en[k] }) };
});

function load(apiKey: string, os: 'android' | 'ios') {
  jest.resetModules();
  jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { android: { config: { googleMaps: { apiKey } } } } } }));
  require('react-native').Platform.OS = os;
  return require('../PlatformMap.native').default;
}

describe('PlatformMap on a build without a Google Maps key (Q69)', () => {
  it('Android without a key shows the unavailable panel, in the user language', async () => {
    const MapView = load('', 'android');
    await render(<MapView />);
    expect(screen.getByTestId('map-unavailable')).toBeTruthy();
    expect(screen.getByText(TR.en.mapUnavailable)).toBeTruthy();
    expect(screen.queryByTestId('native-map')).toBeNull();
  });

  it('a camera call through the ref does not throw', async () => {
    const MapView = load('', 'android');
    const ref = React.createRef<any>();
    await render(<MapView ref={ref} />);
    expect(() => ref.current.animateToRegion({ latitude: 24.7, longitude: 46.7, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 500)).not.toThrow();
  });

  it('a keyed Android build and iOS mount the native map', async () => {
    await render(React.createElement(load('synthetic-test-key', 'android')));
    expect(screen.getByTestId('native-map')).toBeTruthy();
    await render(React.createElement(load('', 'ios')));
    expect(screen.getByTestId('native-map')).toBeTruthy();
  });
});
