import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import RNMapView, { Marker, Circle } from 'react-native-maps';
import type { MapViewProps } from 'react-native-maps';
import { useLang } from '../context';

/**
 * Q69: on Android the Google Maps SDK aborts the screen when the build has no
 * API key (the key comes from the build environment, see app.config.js). Map
 * screens import MapView from here, so a missing key shows a "map unavailable"
 * panel instead of crashing. iOS uses Apple Maps and needs no key.
 */
export function hasGoogleMapsKey(): boolean {
  const config = (Constants.expoConfig?.android as { config?: { googleMaps?: { apiKey?: string } } } | undefined)?.config;
  return Boolean(config?.googleMaps?.apiKey);
}

function UnavailableText() {
  const { t } = useLang();
  return <Text style={styles.text}>{t('mapUnavailable')}</Text>;
}

class MapUnavailable extends React.Component<MapViewProps> {
  // Screens move the camera through a ref; with no map there is nothing to move.
  animateToRegion(): void {}

  render() {
    return (
      <View style={[styles.box, this.props.style]} testID="map-unavailable" accessible accessibilityRole="text">
        <UnavailableText />
      </View>
    );
  }
}

const MapView = (Platform.OS === 'android' && !hasGoogleMapsKey() ? MapUnavailable : RNMapView) as unknown as typeof RNMapView;
type MapView = RNMapView;

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F3', minHeight: 160 },
  text: { color: '#4B5B55', fontSize: 15, textAlign: 'center', padding: 16 },
});

export default MapView;
export { Marker, Circle };
