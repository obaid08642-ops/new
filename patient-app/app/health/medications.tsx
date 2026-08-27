import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { medicationT } from '../../src/i18n/medications';

type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; today_doses?: Array<{ status: string }>; times?: string[]; chronic?: boolean };

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => medicationT(lang, key, vars);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/health/reminders'); const rows = Array.isArray(response) ? response : response?.data; setReminders(Array.isArray(rows) ? rows : []); }
    catch { setError(t('logError')); }
    finally { setLoading(false); }
  }, [lang]);
  React.useEffect(() => { load(); }, [load]);

  const scheduled = reminders.reduce((sum, item) => sum + (item.today_doses?.length || item.times?.length || 0), 0);
  const taken = reminders.reduce((sum, item) => sum + (item.today_doses || []).filter((dose) => dose.status === 'taken').length, 0);
  const chronic = reminders.filter((item) => item.chronic).length;
  const progress = scheduled ? Math.min(100, Math.round((taken / scheduled) * 100)) : 0;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} />
      <View style={styles.titleWrap}><AppText variant="h3">{t('title')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('dailyPlan')}</AppText></View>
      <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> :
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '30' }]}>
            <View style={styles.heroTop}><View style={[styles.ring, { borderColor: colors.primary }]}><AppText variant="h4" color={colors.primary}>{progress}%</AppText><AppText variant="caption" color={colors.textTertiary}>{t('dosesLogged')}</AppText></View><View style={styles.heroCopy}><AppText variant="h5" color={colors.textPrimary}>{t('dailyPlan')}</AppText><AppText variant="bodySM" color={colors.textSecondary}>{scheduled ? t('doseProgress', { taken, scheduled }) : t('noDoseToday')}</AppText></View></View>
            <View style={[styles.track, { backgroundColor: colors.surface }]}><View style={[styles.fill, { width: `${progress}%`, backgroundColor: colors.primary }]} /></View>
            <AppText variant="caption" color={colors.textTertiary} align="right">{t('safeReminder')}</AppText>
          </Card>
        </Animated.View>
        {error && <Animated.View entering={FadeInDown.duration(280)}><Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card></Animated.View>}
        <Animated.View entering={FadeInDown.delay(80).duration(360)}><NavigationCard title={t('remindersToday')} detail={reminders.length ? t('activeReminders', { count: reminders.length }) : t('noActiveReminders')} action={t('viewReminders')} tint={colors.primary} onPress={() => router.push('/health/medication-reminder-list')} /></Animated.View>
        <Animated.View entering={FadeInDown.delay(150).duration(360)}><NavigationCard title={t('deviceAlerts')} detail={t('deviceAlertsHint')} action={t('syncAlerts')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-list')} /></Animated.View>
        <Animated.View entering={FadeInDown.delay(185).duration(360)}><NavigationCard title={t('addReminder')} detail={t('medicationAndDose')} action={t('add')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-add')} /></Animated.View>
        <Animated.View entering={FadeInDown.delay(255).duration(360)}><NavigationCard title={t('chronicMeds')} detail={chronic ? t('chronicCount', { count: chronic }) : t('chronicHint')} action={t('manage')} tint={colors.warning} onPress={() => router.push('/health/chronic-medications')} /></Animated.View>
        <Animated.View entering={FadeInDown.delay(325).duration(360)}><NavigationCard title={t('prescriptions')} detail={t('prescriptionsHint')} action={t('viewPrescriptions')} tint={colors.info} onPress={() => router.push('/health/prescriptions')} /></Animated.View>
      </ScrollView>}
  </View>;
}

function NavigationCard({ title, detail, action, tint, onPress }: { title: string; detail: string; action: string; tint: string; onPress: () => void }) {
  const { colors } = useApp();
  return <Card style={styles.navCard}><View style={[styles.tintBar, { backgroundColor: tint }]} /><View style={styles.navCopy}><AppText variant="h6">{title}</AppText><AppText variant="caption" color={colors.textTertiary}>{detail}</AppText></View><Button label={action} variant="outline" size="sm" full={false} onPress={onPress} /></Card>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, hero: { gap: 14, borderWidth: 1 }, heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }, ring: { width: 74, height: 74, borderRadius: 37, borderWidth: 5, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, alignItems: 'flex-end', gap: 4 }, track: { height: 8, borderRadius: 99, overflow: 'hidden', width: '100%' }, fill: { height: '100%', borderRadius: 99 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, navCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 92 }, tintBar: { width: 5, height: 52, borderRadius: 99 }, navCopy: { flex: 1, alignItems: 'flex-end', gap: 4 } });
