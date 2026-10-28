import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useLang, useTheme } from '../context';
import { FS, FW, R, SP, TR } from '../constants';
import type { ScanState } from '../utils/scanStatus';

/** The two sentences, for a toast or a line of text (they live in TR so the screens do not repeat them). */
export const scanText = (lang: 'ar' | 'en', key: 'scanChecking' | 'scanRejected' | 'scanUploadAnother'): string => TR[lang][key];

/**
 * The state of an uploaded file that is not simply ready: "Being checked for safety" with a small spinner while the scan runs, and
 * the rejection with a re-upload action when it failed. Renders nothing for an ok file.
 */
export function ScanStatusBadge({ state, onReupload, style }: { state: ScanState; onReupload?: () => void; style?: object }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  if (state === 'ok') return null;
  if (state === 'pending') {
    return (
      <View testID="scan-status" accessibilityLiveRegion="polite" style={[{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.xs }, style]}>
        <ActivityIndicator size="small" color={theme.textSub} />
        <Text style={{ fontSize: FS.xs, color: theme.textSub, flexShrink: 1, textAlign: AR ? 'right' : 'left' }}>{scanText(lang, 'scanChecking')}</Text>
      </View>
    );
  }
  return (
    <View testID="scan-status" accessibilityRole="alert" style={[{ backgroundColor: theme.dangerBg, borderRadius: R.lg, padding: SP.md, gap: SP.xs }, style]}>
      <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>{scanText(lang, 'scanRejected')}</Text>
      {onReupload ? (
        <TouchableOpacity testID="scan-status-reupload" accessibilityRole="button" onPress={onReupload} style={{ minHeight: 44, justifyContent: 'center', alignSelf: AR ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.danger, textDecorationLine: 'underline' }}>{scanText(lang, 'scanUploadAnother')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * After an upload or a failed upload: tell the person, without treating "being checked" as an error. Returns true when the request
 * error was the scanner refusing the file (the rejection sentence was shown), so the caller does not show a second message.
 */
export function announceScan(show: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void, lang: 'ar' | 'en', state: ScanState): boolean {
  if (state === 'pending') { show(scanText(lang, 'scanChecking'), 'info'); return false; }
  if (state === 'rejected') { show(scanText(lang, 'scanRejected'), 'error'); return true; }
  return false;
}
