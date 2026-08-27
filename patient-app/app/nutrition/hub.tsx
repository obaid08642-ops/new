import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { nutritionT } from '../../src/i18n/nutrition';

type Profile = { profile_ready?: boolean; goal?: string; daily_calorie_target?: number; daily_water_target_ml?: number; bmi?: number | null };
type Summary = { meals_count?: number; calories?: { consumed?: number; target?: number | null } };

export default function NutritionHubScreen() {
  const insets = useSafeAreaInsets(); const { colors, isDark, lang } = useApp(); const t = (key: any, vars?: any) => nutritionT(lang, key, vars);
  const [profile, setProfile] = React.useState<Profile | null>(null); const [summary, setSummary] = React.useState<Summary | null>(null); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => { setLoading(true); setError(null); try { const [p, s]: any[] = await Promise.all([apiFetch('/nutrition/profile'), apiFetch('/nutrition/daily-summary')]); setProfile(p?.data || p); setSummary(s?.data || s); } catch { setError(t('error')); } finally { setLoading(false); } }, [lang]);
  React.useEffect(() => { load(); }, [load]);
  const target = summary?.calories?.target ?? profile?.daily_calorie_target ?? null; const consumed = summary?.calories?.consumed ?? 0; const percent = target ? Math.min(100, Math.round(consumed / target * 100)) : 0;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3" color="#fff">{t('title')}</AppText><AppText variant="caption" color="rgba(255,255,255,0.82)">{t('subtitle')}</AppText></View><IconButton icon="back" bg="rgba(255,255,255,0.16)" color="#fff" onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}
      <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroRow}><View style={[styles.ring, { borderColor: colors.primary }]}><AppText variant="h5" color={colors.primary}>{target ? `${percent}%` : '—'}</AppText></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}><AppText variant="h5">{profile?.profile_ready ? t('summary') : t('setupTitle')}</AppText><AppText variant="bodySM" color={colors.textSecondary}>{target ? `${consumed} / ${target} kcal` : t('setupHint')}</AppText></View></View><Button label={profile?.profile_ready ? t('bodyGoals') : t('setup')} variant="outline" size="sm" full={false} onPress={() => router.push('/nutrition/body-target')} /></Card></Animated.View>
      <Animated.View entering={FadeInDown.delay(80).duration(320)}><ActionCard icon="calendar" title={t('dailyTracker')} detail={t('mealsLogged', { count: summary?.meals_count || 0 })} color={colors.primary} action={t('today')} onPress={() => router.push('/nutrition/daily-tracker')} /></Animated.View>
      <Animated.View entering={FadeInDown.delay(150).duration(320)}><ActionCard icon="food" title={t('logMeal')} detail={t('nutritionSafety')} color={colors.success} action={t('addMeal')} onPress={() => router.push('/nutrition/log-meal')} /></Animated.View>
      <Animated.View entering={FadeInDown.delay(220).duration(320)}><ActionCard icon="water" title={t('waterLog')} detail={target ? `${profile?.daily_water_target_ml || 0} ml` : t('noTarget')} color={colors.info} action={t('dailyTracker')} onPress={() => router.push('/nutrition/daily-tracker')} /></Animated.View>
    </ScrollView>}
  </View>;
}
function ActionCard({ icon, title, detail, color, action, onPress }: { icon: any; title: string; detail: string; color: string; action: string; onPress: () => void }) { const { colors } = useApp(); return <Card style={styles.action}><View style={[styles.iconWrap, { backgroundColor: color + '1C' }]}><Icon name={icon} size={23} color={color} /></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{title}</AppText><AppText variant="caption" color={colors.textTertiary} numberOfLines={2}>{detail}</AppText></View><Button label={action} variant="ghost" size="sm" full={false} onPress={onPress} /></Card>; }
const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, titleWrap: { flex: 1, alignItems: 'center', gap: 2 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, hero: { gap: 14, borderWidth: 1 }, heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }, ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 5, alignItems: 'center', justifyContent: 'center' }, action: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 90 }, iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 } });
