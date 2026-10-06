import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** The shared shape of MapPrimitives.native.tsx (react-native-maps) and MapPrimitives.web.tsx (the web preview). */
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
export interface MapViewProps {
  provider?: string | null;
  style?: StyleProp<ViewStyle>;
  region?: Region;
  initialRegion?: Region;
  children?: ReactNode;
}
export interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  pinColor?: string;
}
declare const MapView: ComponentType<MapViewProps>;
export const Marker: ComponentType<MarkerProps>;
export const PROVIDER_DEFAULT: string | null;
export default MapView;
