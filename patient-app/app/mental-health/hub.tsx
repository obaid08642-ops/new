import React from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { mentalHealthT } from '../../src/i18n/mental-health';

type RouteCard = { key: 'moodJournal' | 'urgentHelp' | 'consultation'; icon: IconName; color: string; route: string; descriptionKey: 'moodPrompt' | 'urgentBody' | 'subtitle' };

export default function MentalHealthHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, lang } = useApp();
  const t = (key: Parameters<typeof mentalHealthT>[1]) => mentalHealthT(lang, key);
  const cards: RouteCard[] = [
    { key: 'moodJournal', icon: 'edit', color: '#7A6BEA', route: '/mental-health/mood-journal', descriptionKey: 'moodPrompt' },
    { key: 'consultation', icon: 'doctor', color: '#2563EB', route: '/(tabs)/consultations', descriptionKey: 'subtitle' },
    { key: 'urgentHelp', icon: 'call', color: '#DC2626', route: '/mental-health/crisis-support', descriptionKey: 'urgentBody' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 14 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}>
          <Icon name="back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <AppText variant="h4" color="#FFFFFF">{t('title')}</AppText>
        <AppText variant="caption" color="rgba(255,255,255,0.82)">{t('subtitle')}</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
          <Icon name="info" size={19} color="#4338CA" />
          <AppText variant="caption" color={colors.textPrimary} style={styles.noticeText}>{t('wellbeingNotice')}</AppText>
        </View>

        {cards.map((card) => (
          <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: card.color + '33' }]}>
            <View style={[styles.iconWrap, { backgroundColor: card.color + '1A' }]}>
              <Icon name={card.icon} size={24} color={card.color} />
            </View>
            <View style={styles.cardText}>
              <AppText variant="h6" color={colors.textPrimary}>{t(card.key)}</AppText>
              <AppText variant="caption" color={colors.textTertiary} numberOfLines={card.key === 'urgentHelp' ? 3 : 2}>{t(card.descriptionKey)}</AppText>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}

        <View style={[styles.footerNotice, { backgroundColor: colors.backgroundSecondary }]}>
          <AppText variant="caption" color={colors.textSecondary} style={styles.noticeText}>{t('noDiagnosis')}</AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 26, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  content: { padding: 16, gap: 12, paddingBottom: 92 },
  notice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  noticeText: { flex: 1, textAlign: 'right', lineHeight: 20 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18, borderWidth: 1 },
  iconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, alignItems: 'flex-end', gap: 4 },
  footerNotice: { padding: 14, borderRadius: 16, marginTop: 4 },
});
