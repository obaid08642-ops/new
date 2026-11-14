import React from 'react';
import { Text, View } from 'react-native';
import { step as scale, useScreenUi } from './screen/ScreenKit';

/** Shown instead of an upload / camera / gallery button while the backend reports uploads_enabled === false. */
export function UploadsUnavailable({ testID = 'uploads-unavailable' }: { testID?: string }) {
  const { t, c, k, flow } = useScreenUi();
  const look = c.status.warning;
  return (
    <View testID={testID} style={{ borderRadius: 16, backgroundColor: look.bg, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ ...scale(t, 'meta', 'medium'), color: look.fg, ...flow }}>{k('uploads.unavailable')}</Text>
    </View>
  );
}
