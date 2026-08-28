import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type MapProps = { style?: any; children?: React.ReactNode; initialRegion?: any; onPress?: (event: any) => void };

const PlatformMap = forwardRef<any, MapProps>(({ style, children }, ref) => {
  useImperativeHandle(ref, () => ({ animateToRegion: () => undefined }));
  return <View style={[styles.container, style]}><Text style={styles.text}>Interactive map is available in the native app.</Text>{children}</View>;
});
PlatformMap.displayName = 'PlatformMap';

export const Marker = (_props: any) => null;
export const Circle = (_props: any) => null;
export default PlatformMap;

const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }, text: { color: '#475569', fontSize: 13, textAlign: 'center', padding: 16 } });
