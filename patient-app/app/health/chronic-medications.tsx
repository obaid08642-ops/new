import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { medicationT } from '../../src/i18n/medications';
import { getMedicationNotificationPreferences } from '../../src/utils/medication-notifications';

type ChronicMedication = { id: string; name?: string; dose?: string; frequency?: string; pills_remaining?: number | null; refill_date?: string | null; days_until_refill?: number | null; needs_refill_soon?: boolean; refill_lead_days?: 2 | 3; active?: boolean };

export default function ChronicMedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => medicationT(lang, key, vars);
  const [items, setItems] = React.useState<ChronicMedication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response: any = await apiFetch('/health/chronic-meds');
      const rows: ChronicMedication[] = Array.isArray(response) ? response : response?.data || [];
      const enriched = await Promise.all(rows.map(async (item) => {
        const preferences = await getMedicationNotificationPreferences(item.id);
        const lead: 2 | 3 = preferences.refill_lead_days === 2 ? 2 : 3;
        return { ...item, refill_lead_days: lead, needs_refill_soon: item.days_until_refill == null ? Boolean(item.needs_refill_soon) : item.days_until_refill <= lead };
      }));
      setItems(enriched);
    }
    catch { setError(t('refillUpdateError')); } finally { setLoading(false); }
  }, [lang]);
  React.useEffect(() => { load(); }, [load]);
  const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {
    setAction(`${kind}-${id}`); setError(null);
    try {
      const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';
      const response: any = await apiFetch(`/health/reminders/${id}${suffix}`, { method: 'POST', body: kind === 'snooze' ? JSON.stringify({ days: 3 }) : undefined });
      if (kind === 'refill' && response?.order_id) { router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: response.order_id } }); return; }
      await load();
    }
    catch { setError(kind === 'refill' ? t('refillError') : t('refillUpdateError')); } finally { setAction(null); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppText variant="h3">{t('chronicTitle')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('refillTracking')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.notice, { backgroundColor: colors.infoSurface, borderColor: colors.info + '33' }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">{t('chronicNotice')}</AppText></Card></Animated.View>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noChronic')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noChronicHint')}</AppText><Button label={t('addReminder')} variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
      {items.map((item, index) => <Animated.View key={item.id} entering={FadeInDown.delay(80 + index * 60).duration(340)} exiting={FadeOut.duration(150)}><ChronicCard item={item} colors={colors} t={t} action={action} run={run} /></Animated.View>)}
    </ScrollView>}
  </View>;
}

function ChronicCard({ item, colors, t, action, run }: { item: ChronicMedication; colors: any; t: any; action: string | null; run: (id: string, kind: 'refill' | 'snooze' | 'cancel') => void }) {
  const frequency = item.frequency === 'daily' ? t('daily') : item.frequency === 'weekly' ? t('weekly') : t('asNeeded');
  const accent = item.needs_refill_soon ? colors.warning : colors.primary;
  return <Card style={[styles.item, { borderColor: accent + '33' }]}><View style={styles.itemHeader}><View style={[styles.supplyMark, { backgroundColor: accent + '22' }]}><AppText variant="h5" color={accent}>◼</AppText></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{item.name || t('medicineUnnamed')}</AppText><AppText variant="bodyXS" color={colors.textTertiary}>{t('doseOf', { name: item.dose || t('doseUnrecorded'), dose: frequency })}</AppText></View><Badge label={t('chronicMedication')} color={colors.warning} /></View><SupplyState item={item} colors={colors} t={t} />{item.needs_refill_soon && <Button label={t('startRefill')} variant="primary" icon="shopping_cart" loading={action === `refill-${item.id}`} onPress={() => run(item.id, 'refill')} />}<View style={styles.actions}><Button label={t('deferThreeDays')} variant="outline" size="sm" full={false} loading={action === `snooze-${item.id}`} onPress={() => run(item.id, 'snooze')} /><Button label={t('stopRefillTracking')} variant="ghost" size="sm" full={false} loading={action === `cancel-${item.id}`} onPress={() => run(item.id, 'cancel')} /></View></Card>;
}

function SupplyState({ item, colors, t }: { item: ChronicMedication; colors: any; t: any }) {
  if (item.refill_date) return <View style={[styles.supply, { backgroundColor: item.needs_refill_soon ? colors.warningSurface : colors.surfaceSecondary }]}><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelSM" color={item.needs_refill_soon ? colors.warning : colors.textSecondary}>{item.needs_refill_soon ? t('refillSoon') : t('refillFollowup')}</AppText><AppText variant="caption" color={colors.textTertiary}>{item.days_until_refill == null ? String(item.refill_date).slice(0, 10) : t('daysLeft', { days: item.days_until_refill })}</AppText>{item.refill_lead_days && <AppText variant="caption" color={colors.textTertiary}>{`${t('refillLeadDays')}: ${item.refill_lead_days === 2 ? t('twoDays') : t('threeDays')}`}</AppText>}</View></View>;
  if (item.pills_remaining != null) return <View style={[styles.supply, { backgroundColor: colors.surfaceSecondary }]}><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelSM" color={colors.textSecondary}>{t('remainingRecorded')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('unitsLeft', { count: item.pills_remaining })}</AppText></View></View>;
  return <View style={[styles.supply, { backgroundColor: colors.surfaceSecondary }]}><AppText variant="caption" color={colors.textTertiary} align="right">{t('noInventory')}</AppText></View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, notice: { alignItems: 'flex-end', borderWidth: 1 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, empty: { gap: 12, alignItems: 'flex-end', padding: 20 }, item: { gap: 12, borderWidth: 1 }, itemHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, supplyMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, supply: { borderRadius: 14, padding: 12, alignItems: 'flex-end' }, actions: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8 } });
