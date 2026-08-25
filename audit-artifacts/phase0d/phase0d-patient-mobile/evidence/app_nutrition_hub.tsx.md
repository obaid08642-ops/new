# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nutrition/hub.tsx`
- **Member SHA-256:** `4c8f095c34463ce1f580e2ebc75d7d4a7a094261b1842c66f73c997c833bbaf0`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `15: export default function NutritionHubScreen() {`
- `24: <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3" color="#fff">{t('title')}</AppText><AppText variant="caption"`
- `26: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `27: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroRow}><View style={[styles.ring, { borderColor: colors.pri`
- `28: <Animated.View entering={FadeInDown.delay(80).duration(320)}><ActionCard icon="calendar" title={t('dailyTracker')} detail={t('mealsLogged', { count: summary?.meals_count || 0 })} color={colors.primary} action={t('today')} onPress={() => rou`
- `29: <Animated.View entering={FadeInDown.delay(150).duration(320)}><ActionCard icon="food" title={t('logMeal')} detail={t('nutritionSafety')} color={colors.success} action={t('addMeal')} onPress={() => router.push('/nutrition/log-meal')} /></Ani`
- `30: <Animated.View entering={FadeInDown.delay(220).duration(320)}><ActionCard icon="water" title={t('waterLog')} detail={target ? `${profile?.daily_water_target_ml || 0} ml` : t('noTarget')} color={colors.info} action={t('dailyTracker')} onPres`
- `34: function ActionCard({ icon, title, detail, color, action, onPress }: { icon: any; title: string; detail: string; color: string; action: string; onPress: () => void }) { const { colors } = useApp(); return <Card style={styles.action}><View s`
### backend_consumers_or_contracts
- `18: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const [p, s]: any[] = await Promise.all([apiFetch('/nutrition/profile'), apiFetch('/nutrition/daily-summary')]); setProfile(p?.data || p); setSummary(s?.da`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `17: const [profile, setProfile] = React.useState<Profile | null>(null); const [summary, setSummary] = React.useState<Summary | null>(null); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | nu`
- `18: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const [p, s]: any[] = await Promise.all([apiFetch('/nutrition/profile'), apiFetch('/nutrition/daily-summary')]); setProfile(p?.data || p); setSummary(s?.da`
- `23: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `25: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `26: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `29: <Animated.View entering={FadeInDown.delay(150).duration(320)}><ActionCard icon="food" title={t('logMeal')} detail={t('nutritionSafety')} color={colors.success} action={t('addMeal')} onPress={() => router.push('/nutrition/log-meal')} /></Ani`
- `35: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRigh`
### payment_insurance_relevance
- `8: import { AppText, Button, Card, IconButton } from '../../src/components/ui';`
- `26: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `27: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroRow}><View style={[styles.ring, { borderColor: colors.pri`
- `28: <Animated.View entering={FadeInDown.delay(80).duration(320)}><ActionCard icon="calendar" title={t('dailyTracker')} detail={t('mealsLogged', { count: summary?.meals_count || 0 })} color={colors.primary} action={t('today')} onPress={() => rou`
- `29: <Animated.View entering={FadeInDown.delay(150).duration(320)}><ActionCard icon="food" title={t('logMeal')} detail={t('nutritionSafety')} color={colors.success} action={t('addMeal')} onPress={() => router.push('/nutrition/log-meal')} /></Ani`
- `30: <Animated.View entering={FadeInDown.delay(220).duration(320)}><ActionCard icon="water" title={t('waterLog')} detail={target ? `${profile?.daily_water_target_ml || 0} ml` : t('noTarget')} color={colors.info} action={t('dailyTracker')} onPres`
- `34: function ActionCard({ icon, title, detail, color, action, onPress }: { icon: any; title: string; detail: string; color: string; action: string; onPress: () => void }) { const { colors } = useApp(); return <Card style={styles.action}><View s`
### error_empty_loading_retry_cancel
- `17: const [profile, setProfile] = React.useState<Profile | null>(null); const [summary, setSummary] = React.useState<Summary | null>(null); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | nu`
- `18: const load = React.useCallback(async () => { setLoading(true); setError(null); try { const [p, s]: any[] = await Promise.all([apiFetch('/nutrition/profile'), apiFetch('/nutrition/daily-summary')]); setProfile(p?.data || p); setSummary(s?.da`
- `25: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `26: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `35: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRigh`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
