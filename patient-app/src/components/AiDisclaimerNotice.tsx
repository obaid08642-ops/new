import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { AppText } from './ui';
import { Icon } from './Icon';
import { aiDisclaimerText } from '../utils/aiDisclaimer';

/** a95be9a: the server's medical disclaimer under an AI health result (renders nothing without one). */
export function AiDisclaimerNotice({ payload }: { payload: unknown }) {
  const { colors, lang } = useApp();
  const text = aiDisclaimerText(payload, lang);
  if (!text) return null;
  return (
    <View testID="ai-medical-disclaimer" style={[styles.box, { backgroundColor: colors.warningSurface, borderColor: colors.border }]}>
      <Icon name="warning" size={18} color={colors.warning} />
      <AppText variant="caption" color={colors.textPrimary} style={styles.text}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 },
  text: { flex: 1, textAlign: 'right', lineHeight: 20 },
});
