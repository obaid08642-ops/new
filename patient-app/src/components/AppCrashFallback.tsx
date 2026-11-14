import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getLocales } from 'react-native-localize';

import { DSButton, DSText } from '../design-system';
import { Spacing } from '../design-system/tokens';
import { autoTranslate } from '../i18n';
import { pickDeviceLanguage } from '../i18n/deviceLanguage';

/**
 * 15.5: what a patient sees when a screen crashes above every screen (the root error boundary in app/_layout.tsx). It draws
 * with the design system and reads its words from the locale files, in the device's language (the same rule as the rest of
 * the app), so a crash never leaves a blank screen and never shows a technical message. "Retry" re-renders the app tree.
 */
export function AppCrashFallback({ onRetry }: { onRetry: () => void }) {
  const lang = pickDeviceLanguage(getLocales());
  const tr = (key: string) => autoTranslate(key, lang);
  return (
    <View style={styles.root} accessibilityRole="alert">
      <DSText variant="h4" align="center">{tr('errors.crashTitle')}</DSText>
      <DSText variant="bodySM" align="center">{tr('errors.crashBody')}</DSText>
      <DSButton label={tr('common.retry')} onPress={onRetry} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.lg,
  },
});
