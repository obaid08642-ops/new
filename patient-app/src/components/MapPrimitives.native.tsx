import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import RNMapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import type { MapViewProps } from 'react-native-maps';
import { LocalizedText } from './LocalizedText';
import { lightColors } from '../theme/colors';

/**
 * Q69: on Android the Google Maps SDK aborts the screen when the build has no
 * API key (the key comes from the build environment, never the repo; see
 * app.config.js). Every map screen imports MapView from here, so a missing key
 * shows a clear "map unavailable" panel instead of crashing. iOS uses Apple
 * Maps (PROVIDER_DEFAULT) and needs no key.
 */
export function hasGoogleMapsKey(): boolean {
  const config = (Constants.expoConfig?.android as { config?: { googleMaps?: { apiKey?: string } } } | undefined)?.config;
  return Boolean(config?.googleMaps?.apiKey);
}

class MapUnavailable extends React.Component<MapViewProps> {
  // Screens move the camera through a ref; with no map there is nothing to move.
  animateToRegion(): void {}

  render() {
    return (
      <View style={[styles.box, this.props.style]} testID="map-unavailable" accessible accessibilityRole="text">
        <LocalizedText style={styles.text}>الخريطة غير متاحة حالياً</LocalizedText>
      </View>
    );
  }
}

const MapView = (Platform.OS === 'android' && !hasGoogleMapsKey() ? MapUnavailable : RNMapView) as unknown as typeof RNMapView;
type MapView = RNMapView;

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: lightColors.bg, minHeight: 160 },
  text: { color: lightColors.t, fontSize: 15, textAlign: 'center', padding: 16 },
});

export default MapView;
export { Marker, PROVIDER_DEFAULT };
export type { Region } from 'react-native-maps';
