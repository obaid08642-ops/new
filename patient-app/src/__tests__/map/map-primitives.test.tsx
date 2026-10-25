import React from 'react';
import { render, screen } from '@testing-library/react-native';

import MapView, { Marker } from '../../components/MapPrimitives.native';

/** The adapter keeps react-native-maps' API on top of MapLibre; the native module is captured here instead of drawn. */
const mockSeen: { map?: Record<string, unknown>; marker?: Record<string, unknown>; camera?: Record<string, unknown>; easeTo: jest.Mock } = { easeTo: jest.fn() };

jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Map: (props: any) => { mockSeen.map = props; return React.createElement(View, { testID: 'ml-map' }, props.children); },
    Marker: (props: any) => { mockSeen.marker = props; return React.createElement(View, { testID: 'ml-marker' }, props.children); },
    UserLocation: () => React.createElement(View, { testID: 'ml-user-location' }),
    Camera: React.forwardRef((props: any, ref: any) => { mockSeen.camera = props; React.useImperativeHandle(ref, () => ({ easeTo: mockSeen.easeTo })); return null; }),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));

describe('MapPrimitives on MapLibre', () => {
  it('opens on the first region, with the keyless OpenFreeMap style, and shows the attribution on the map', async () => {
    await render(<MapView initialRegion={{ latitude: 24.7, longitude: 46.6, latitudeDelta: 0.02, longitudeDelta: 0.02 }} userInterfaceStyle="dark" showsUserLocation />);
    expect(mockSeen.map?.mapStyle).toBe('https://tiles.openfreemap.org/styles/dark');
    expect((mockSeen.camera?.initialViewState as { center: number[] }).center).toEqual([46.6, 24.7]);
    expect(screen.getByTestId('ml-user-location')).toBeTruthy();
    expect(screen.getByTestId('map-attribution').props.children).toMatch(/OpenStreetMap/);
  });

  it('converts MapLibre events to the regions and coordinates the screens expect', async () => {
    const onRegion = jest.fn();
    const onPress = jest.fn();
    await render(<MapView initialRegion={{ latitude: 24.7, longitude: 46.6, latitudeDelta: 0.02, longitudeDelta: 0.02 }} onRegionChangeComplete={onRegion} onPress={onPress} />);
    (mockSeen.map?.onRegionDidChange as (e: unknown) => void)({ nativeEvent: { center: [46.7, 24.8], bounds: [46.6, 24.7, 46.8, 24.9], zoom: 12 } });
    expect(onRegion).toHaveBeenCalledWith(expect.objectContaining({ latitude: 24.8, longitude: 46.7 }));
    (mockSeen.map?.onPress as (e: unknown) => void)({ nativeEvent: { lngLat: [46.61, 24.71], point: [10, 10] } });
    expect(onPress).toHaveBeenCalledWith({ nativeEvent: { coordinate: { latitude: 24.71, longitude: 46.61 } } });
  });

  it('animateToRegion eases the camera, and a changed controlled region moves it too', async () => {
    const ref = React.createRef<{ animateToRegion: (r: unknown, ms?: number) => void }>();
    const r1 = { latitude: 24.7, longitude: 46.6, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    const view = await render(<MapView ref={ref} region={r1} />);
    ref.current?.animateToRegion({ latitude: 21.5, longitude: 39.2, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 300);
    expect(mockSeen.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [39.2, 21.5], duration: 300 }));
    mockSeen.easeTo.mockClear();
    await view.rerender(<MapView ref={ref} region={{ ...r1, latitude: 24.8 }} />);
    expect(mockSeen.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [46.6, 24.8] }));
  });

  it('a marker is placed at [lng, lat] and a screen\'s own pin replaces the default one', async () => {
    const onPress = jest.fn();
    await render(<MapView><Marker coordinate={{ latitude: 24.7, longitude: 46.6 }} onPress={onPress} /></MapView>);
    expect(mockSeen.marker?.lngLat).toEqual([46.6, 24.7]);
    (mockSeen.marker?.onPress as () => void)();
    expect(onPress).toHaveBeenCalled();
    const { Text } = require('react-native');
    await render(<MapView><Marker coordinate={{ latitude: 1, longitude: 2 }}><Text>mine</Text></Marker></MapView>);
    expect(screen.getByText('mine')).toBeTruthy();
  });
});
