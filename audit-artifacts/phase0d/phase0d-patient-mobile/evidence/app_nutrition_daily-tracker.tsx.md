# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nutrition/daily-tracker.tsx`
- **Member SHA-256:** `bc760f670a54aee4098835ffb43889c08120dde98bca2d70769a106081c00c0b`
- **Line count:** 50
- **Read range:** `1-50`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `15: export default function DailyTrackerScreen() {`
- `36: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('logMeal')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/nutrition/log-meal')} /><View style={styles.titleWrap}><AppText varia`
- `38: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `42: <Animated.View entering={FadeInDown.delay(140).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('waterLog')}</AppText><Badge label={waterTarget ? `${waterPercent}%` : t('noTarget')} col`
- `43: <Animated.View entering={FadeInDown.delay(210).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('mealHistory')}</AppText><Button label={t('addMeal')} variant="ghost" size="sm" full={fal`
### backend_consumers_or_contracts
- `25: const [summaryResponse, mealsResponse]: any[] = await Promise.all([apiFetch(`/nutrition/daily-summary?date=${date}`), apiFetch(`/nutrition/meals?date=${date}`)]);`
- `31: const addWater = async (amount: number) => { setWaterBusy(amount); setError(null); try { await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: amount }) }); await load(); } catch { setError(t('saveError')); `
### auth_ownership
- `12: type Summary = { calories: { consumed: number; burned: number; target: number | null; net: number }; macros: { protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }; water: { consumed_ml: number; target_ml: number | null }; e`
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `19: const [summary, setSummary] = React.useState<Summary | null>(null); const [meals, setMeals] = React.useState<Meal[]>([]); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null); con`
- `23: setLoading(true); setError(null);`
- `27: } catch { setError(t('error')); setSummary(null); setMeals([]); } finally { setLoading(false); }`
- `31: const addWater = async (amount: number) => { setWaterBusy(amount); setError(null); try { await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: amount }) }); await load(); } catch { setError(t('saveError')); `
- `35: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `37: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `38: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `41: <Animated.View entering={FadeInDown.delay(70).duration(320)}><View style={styles.metrics}><MetricCard label={t('protein')} value={`${summary.macros.protein_g} g`} color={colors.success} /><MetricCard label={t('carbs')} value={`${summary.mac`
- `42: <Animated.View entering={FadeInDown.delay(140).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('waterLog')}</AppText><Badge label={waterTarget ? `${waterPercent}%` : t('noTarget')} col`
- `45: {!summary && !error && <Card style={styles.empty}><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noData')}</AppText></Card>}`
- `50: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { alignItems: 'center', gap: 2 `
### payment_insurance_relevance
- `7: import { AppText, Badge, Button, Card, IconButton } from '../../src/components/ui';`
- `12: type Summary = { calories: { consumed: number; burned: number; target: number | null; net: number }; macros: { protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }; water: { consumed_ml: number; target_ml: number | null }; e`
- `38: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `40: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroTop}><View style={[styles.ring, { borderColor: colors.pri`
- `41: <Animated.View entering={FadeInDown.delay(70).duration(320)}><View style={styles.metrics}><MetricCard label={t('protein')} value={`${summary.macros.protein_g} g`} color={colors.success} /><MetricCard label={t('carbs')} value={`${summary.mac`
- `42: <Animated.View entering={FadeInDown.delay(140).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('waterLog')}</AppText><Badge label={waterTarget ? `${waterPercent}%` : t('noTarget')} col`
- `43: <Animated.View entering={FadeInDown.delay(210).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('mealHistory')}</AppText><Button label={t('addMeal')} variant="ghost" size="sm" full={fal`
- `45: {!summary && !error && <Card style={styles.empty}><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noData')}</AppText></Card>}`
- `49: function MetricCard({ label, value, color }: { label: string; value: string; color: string }) { return <Card style={[styles.metric, { borderColor: color + '33' }]}><AppText variant="caption" color={color}>{label}</AppText><AppText variant="`
### error_empty_loading_retry_cancel
- `19: const [summary, setSummary] = React.useState<Summary | null>(null); const [meals, setMeals] = React.useState<Meal[]>([]); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState<string | null>(null); con`
- `23: setLoading(true); setError(null);`
- `27: } catch { setError(t('error')); setSummary(null); setMeals([]); } finally { setLoading(false); }`
- `31: const addWater = async (amount: number) => { setWaterBusy(amount); setError(null); try { await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: amount }) }); await load(); } catch { setError(t('saveError')); `
- `37: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `38: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `42: <Animated.View entering={FadeInDown.delay(140).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('waterLog')}</AppText><Badge label={waterTarget ? `${waterPercent}%` : t('noTarget')} col`
- `45: {!summary && !error && <Card style={styles.empty}><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noData')}</AppText></Card>}`
- `50: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { alignItems: 'center', gap: 2 `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
