import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Badge, Button, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { nutritionT } from '../../src/i18n/nutrition';

type Meal = { id?: string; name: string; calories: number; meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; protein_g?: number; logged_at: string };
type Summary = { calories: { consumed: number; burned: number; target: number | null; net: number }; macros: { protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }; water: { consumed_ml: number; target_ml: number | null }; exercise: { total_minutes: number; calories_burned: number; sessions: number }; meals_count: number };
const localDate = () => { const now = new Date(); const offset = now.getTimezoneOffset() * 60_000; return new Date(now.getTime() - offset).toISOString().slice(0, 10); };

export default function DailyTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: any, vars?: any) => nutritionT(lang, key, vars);
  const [summary, setSummary] = React.useState<Summary | null>(null); const [meals, setMeals] = React.useState<Meal[]>([]); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null); const [waterBusy, setWaterBusy] = React.useState<number | null>(null);
  const date = localDate();

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [summaryResponse, mealsResponse]: any[] = await Promise.all([apiFetch(`/nutrition/daily-summary?date=${date}`), apiFetch(`/nutrition/meals?date=${date}`)]);
      setSummary(summaryResponse?.data || summaryResponse); const rows = Array.isArray(mealsResponse) ? mealsResponse : mealsResponse?.data; setMeals(Array.isArray(rows) ? rows : []);
    } catch { setError(t('error')); setSummary(null); setMeals([]); } finally { setLoading(false); }
  }, [date, lang]);
  React.useEffect(() => { load(); }, [load]);

  const addWater = async (amount: number) => { setWaterBusy(amount); setError(null); try { await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: amount }) }); await load(); } catch { setError(t('saveError')); } finally { setWaterBusy(null); } };
  const caloriesTarget = summary?.calories.target ?? null; const caloriesPercent = caloriesTarget ? Math.min(100, Math.round((summary?.calories.consumed || 0) / caloriesTarget * 100)) : 0; const waterTarget = summary?.water.target_ml ?? null; const waterPercent = waterTarget ? Math.min(100, Math.round((summary?.water.consumed_ml || 0) / waterTarget * 100)) : 0;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('logMeal')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/nutrition/log-meal')} /><View style={styles.titleWrap}><AppText variant="h3">{t('dailyTracker')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('today')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {summary && <>
        <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroTop}><View style={[styles.ring, { borderColor: colors.primary }]}><AppText variant="h4" color={colors.primary}>{caloriesTarget ? `${caloriesPercent}%` : '—'}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('calories')}</AppText></View><View style={styles.heroCopy}><AppText variant="h5">{t('summary')}</AppText><AppText variant="bodySM" color={colors.textSecondary}>{caloriesTarget ? `${summary.calories.consumed} / ${caloriesTarget}` : `${summary.calories.consumed} ${t('consumed')}`}</AppText><AppText variant="caption" color={colors.textTertiary}>{caloriesTarget ? `${t('remaining')}: ${Math.max(0, caloriesTarget - summary.calories.consumed)}` : t('noTarget')}</AppText></View></View><View style={[styles.track, { backgroundColor: colors.surface }]}><View style={[styles.fill, { width: `${caloriesPercent}%`, backgroundColor: colors.primary }]} /></View></Card></Animated.View>
        <Animated.View entering={FadeInDown.delay(70).duration(320)}><View style={styles.metrics}><MetricCard label={t('protein')} value={`${summary.macros.protein_g} g`} color={colors.success} /><MetricCard label={t('carbs')} value={`${summary.macros.carbs_g} g`} color={colors.warning} /><MetricCard label={t('fat')} value={`${summary.macros.fat_g} g`} color={colors.secondary} /></View></Animated.View>
        <Animated.View entering={FadeInDown.delay(140).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('waterLog')}</AppText><Badge label={waterTarget ? `${waterPercent}%` : t('noTarget')} color={colors.info} /></View><AppText variant="bodySM" color={colors.textSecondary} align="right">{waterTarget ? `${summary.water.consumed_ml} / ${waterTarget} ml` : t('waterProgress', { value: summary.water.consumed_ml })}</AppText><View style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}><View style={[styles.fill, { width: `${waterPercent}%`, backgroundColor: colors.info }]} /></View><View style={styles.waterActions}><Button label="+250 ml" variant="outline" size="sm" full={false} loading={waterBusy === 250} onPress={() => addWater(250)} /><Button label="+500 ml" variant="primary" size="sm" full={false} loading={waterBusy === 500} onPress={() => addWater(500)} /></View></Card></Animated.View>
        <Animated.View entering={FadeInDown.delay(210).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('mealHistory')}</AppText><Button label={t('addMeal')} variant="ghost" size="sm" full={false} onPress={() => router.push('/nutrition/log-meal')} /></View>{meals.length === 0 ? <AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noMeals')}</AppText> : meals.map((meal) => <View key={meal.id || `${meal.name}-${meal.logged_at}`} style={[styles.mealRow, { borderTopColor: colors.borderLight }]}><Badge label={t(meal.meal_type)} color={colors.primary} /><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelMD">{meal.name}</AppText><AppText variant="caption" color={colors.textTertiary}>{`${meal.calories} kcal${meal.protein_g ? ` · ${meal.protein_g} g ${t('protein')}` : ''}`}</AppText></View></View>)}</Card></Animated.View>
      </>}
      {!summary && !error && <Card style={styles.empty}><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noData')}</AppText></Card>}
    </ScrollView>}
  </View>;
}
function MetricCard({ label, value, color }: { label: string; value: string; color: string }) { return <Card style={[styles.metric, { borderColor: color + '33' }]}><AppText variant="caption" color={color}>{label}</AppText><AppText variant="h6">{value}</AppText></Card>; }
const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { alignItems: 'center', gap: 2 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, hero: { gap: 14, borderWidth: 1 }, heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }, ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, alignItems: 'flex-end', gap: 3 }, track: { height: 8, borderRadius: 99, overflow: 'hidden', width: '100%' }, fill: { height: '100%', borderRadius: 99 }, metrics: { flexDirection: 'row-reverse', gap: 8 }, metric: { flex: 1, borderWidth: 1, alignItems: 'flex-end', gap: 4, minHeight: 72 }, section: { gap: 12 }, sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, waterActions: { flexDirection: 'row-reverse', gap: 8, justifyContent: 'flex-start' }, mealRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, empty: { alignItems: 'flex-end' } });
