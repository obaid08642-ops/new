// @ts-nocheck
// app/settings/language.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, LANGUAGES, LangCode } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';

export default function LanguageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang, setLang } = useApp();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodyLG" style={{ fontWeight: '800' }}>اللغة / Language</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.langCard, { backgroundColor: isDark ? colors.surface : colors.white, margin: 16 } ]}>
        {LANGUAGES.map((item, i) => {
          const isSelected = lang === item.code;
          return (
            <TouchableOpacity
              key={item.code}
              onPress={() => {
                setLang(item.code);
                // Go back or reload if needed, since it's active globally
              }}
              style={[
                styles.langRow,
                i < LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border } ]}>
              <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border } ]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.langInfo}>
                <AppText variant="bodySM" style={{ fontWeight: '800' }}>{item.native}</AppText>
                <AppText variant="bodyXS" style={{ color: colors.textSecondary }}>{item.label}</AppText>
              </View>
              <AppText style={{ fontSize: 20 }}>{item.flag === 'SA' ? '' : item.flag === 'GB' ? '' : item.flag === 'PK' ? '' : item.flag === 'IN' ? '' : item.flag === 'BD' ? '' : ''}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  langCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  langRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  langInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
});
