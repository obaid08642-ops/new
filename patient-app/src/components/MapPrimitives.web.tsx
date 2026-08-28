import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PROVIDER_DEFAULT = 'web-fallback';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapProps = {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: Region;
  region?: Region;
  [key: string]: any;
};

export default forwardRef(function WebMapView({ children, style, initialRegion, region }: MapProps, ref) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => undefined,
    fitToCoordinates: () => undefined,
  }), []);
  const activeRegion = region || initialRegion;
  return (
    <View style={[styles.map, style]} accessibilityLabel="Map preview">
      <Text style={styles.label}>Map preview</Text>
      {activeRegion ? (
        <Text style={styles.coordinates}>
          {activeRegion.latitude.toFixed(5)}, {activeRegion.longitude.toFixed(5)}
        </Text>
      ) : null}
      {children}
    </View>
  );
});

export function Marker({ coordinate, title, children, style }: any) {
  return (
    <View style={[styles.marker, style]} accessibilityLabel={title || 'Map marker'}>
      {children || <Text style={styles.markerDot}>●</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#e7f1f3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: { color: '#24505a', fontWeight: '700' },
  coordinates: { color: '#42737d', marginTop: 4 },
  marker: { position: 'absolute', top: '50%', left: '50%' as any },
  markerDot: { color: '#d9485f', fontSize: 22 },
});
