import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { step as scale, useScreenUi } from './screen/ScreenKit';
import type { ScanState } from '../utils/scanStatus';

/**
 * The state of an uploaded file that is not simply ready: "Being checked for safety" with a small spinner while the scan runs, and
 * the rejection with a re-upload action when it failed. Renders nothing for an ok file.
 */
export function ScanStatusBadge({ state, onReupload, testID = 'scan-status' }: { state: ScanState; onReupload?: () => void; testID?: string }) {
  const { t, c, k, flow } = useScreenUi();
  if (state === 'ok') return null;
  if (state === 'pending') {
    return (
      <View testID={testID} accessibilityRole="text" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActivityIndicator size="small" color={c.text.secondary} />
        <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, flexShrink: 1, ...flow }}>{k('scanStatus.checking')}</Text>
      </View>
    );
  }
  const look = c.status.danger;
  return (
    <View testID={testID} accessibilityRole="alert" style={{ borderRadius: 16, backgroundColor: look.bg, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
      <Text style={{ ...scale(t, 'meta', 'medium'), color: look.fg, ...flow }}>{k('scanStatus.rejected')}</Text>
      {onReupload ? (
        <Pressable accessibilityRole="button" accessibilityLabel={k('scanStatus.uploadAnother')} onPress={onReupload} testID={`${testID}-reupload`} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ ...scale(t, 'meta', 'bold'), color: look.fg, textDecorationLine: 'underline', ...flow }}>{k('scanStatus.uploadAnother')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
