// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp, LANGUAGES, LangCode } from '../../src/context/AppContext';
import { NabdahLogo } from '../../src/components/NabdahLogo';
import { AppText, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, lang, setLang } = useApp();
  const [selected, setSelected] = useState<LangCode>(lang);

  return (
    <View style={[styles.c, { backgroundColor: colors.background, paddingTop: insets.top + 20 } ]}>
      <View style={styles.logoWrap}>
        <NabdahLogo size={84} animated={false} />
        <AppText variant="h2" align="center" style={{ marginTop: 12 }}>اختر لغتك</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">Choose your language</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((l, i) => {
          const active = selected === l.code;
          return (
            <Animated.View key={l.code} entering={FadeInDown.delay(i * 60).duration(400)}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelected(l.code)}
                style={[styles.item, {
                  backgroundColor: active ? colors.primarySurface : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                } ]}>
                {active ? <Icon name="check_circle" size={24} color={colors.primary} /> : <View style={{ width: 24 }}/>}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="h5" color={active ? colors.primary : colors.textPrimary}>{l.native}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{l.label}</AppText>
                </View>
                <AppText variant="h2">{getFlagEmoji(l.flag)}</AppText>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.borderLight, backgroundColor: colors.surface } ]}>
        <Button label="متابعة" variant="gradient" size="lg" iconRight="chevronLeft" onPress={() => { setLang(selected); router.replace('/(auth)/welcome'); }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  logoWrap: { alignItems: 'center', paddingVertical: 16 },
  item: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1.5 },
  footer: { padding: 20, borderTopWidth: 1 },
});
