import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../../packages/design-tokens/dist/ts/tokens';
const T = tokens('light').color;

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
    backgroundColor: T.service.blue.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: { color: T.text.primary, fontWeight: '700' },
  coordinates: { color: T.text.secondary, marginTop: 4 },
  marker: { position: 'absolute', top: '50%', left: '50%' as any },
  markerDot: { color: T.action.primary.bg, fontSize: 22 },
});

/** The hologram pins need the native map layers; the web preview draws none. */
export function HologramLayer(_props: any) {
  return null;
}
