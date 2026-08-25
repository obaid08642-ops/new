# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/nutrition/log-meal.tsx`
- **Member SHA-256:** `a165d65228d897d2de9fa8b53b30bc1474b901c1fe9c0e91ea89fd91cdb2d2af`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router, useLocalSearchParams } from 'expo-router';`
- `14: export default function LogMealScreen() {`
- `32: router.replace('/nutrition/daily-tracker');`
- `38: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><View style={styles.titleWrap}><AppText variant="h3">{t('logMeal')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('nutritionSa`
- `45: <Animated.View entering={FadeInDown.delay(280).duration(300)}><Button label={saving ? t('saving') : t('saveMeal')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>`
### backend_consumers_or_contracts
- `31: await apiFetch('/nutrition/meals', { method: 'POST', body: JSON.stringify({ name: name.trim(), calories: numericCalories, meal_type: mealType, ...(optional[0] !== undefined ? { protein_g: optional[0] } : {}), ...(optional[1] !== undefined ?`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `19: const [mealType, setMealType] = React.useState<MealType>(mealTypes.includes(meal_type as MealType) ? meal_type as MealType : 'snack');`
- `20: const [name, setName] = React.useState(''); const [calories, setCalories] = React.useState(''); const [protein, setProtein] = React.useState(''); const [carbs, setCarbs] = React.useState(''); const [fat, setFat] = React.useState(''); const `
- `21: const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `27: if (!name.trim() || numericCalories === undefined) { setError(t('formRequired')); return; }`
- `28: if (!Number.isFinite(numericCalories) || numericCalories < 0 || optional.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) { setError(t('formInvalid')); return; }`
- `29: setSaving(true); setError(null);`
- `33: } catch { setError(t('saveError')); } finally { setSaving(false); }`
- `37: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `40: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}`
- `45: <Animated.View entering={FadeInDown.delay(280).duration(300)}><Button label={saving ? t('saving') : t('saveMeal')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>`
- `51: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { flex: 1, alignItems: 'center'`
### payment_insurance_relevance
- `7: import { AppText, Button, Card, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `23: const numericPayload = (value: string) => value.trim() === '' ? undefined : Number(value);`
- `25: const numericCalories = numericPayload(calories);`
- `26: const optional = [protein, carbs, fat, fiber].map(numericPayload);`
- `40: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}`
- `41: <Animated.View entering={FadeInDown.duration(300)}><Card style={styles.section}><SectionHeading value="1" title={t('mealType')} colors={colors} /><SegmentedControl value={mealType} onChange={(value) => setMealType(value as MealType)} option`
- `42: <Animated.View entering={FadeInDown.delay(75).duration(300)}><Card style={styles.section}><SectionHeading value="2" title={t('logMeal')} colors={colors} /><Input value={name} onChangeText={setName} placeholder={t('mealName')} /><Input value`
- `43: <Animated.View entering={FadeInDown.delay(150).duration(300)}><Card style={styles.section}><SectionHeading value="3" title={t('summary')} colors={colors} /><Input value={protein} onChangeText={setProtein} placeholder={t('proteinInput')} key`
- `44: <Animated.View entering={FadeInDown.delay(220).duration(300)}><Card style={[styles.notice, { backgroundColor: colors.infoSurface, borderColor: colors.info + '40' }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">{t('n`
### error_empty_loading_retry_cancel
- `21: const [saving, setSaving] = React.useState(false); const [error, setError] = React.useState<string | null>(null);`
- `27: if (!name.trim() || numericCalories === undefined) { setError(t('formRequired')); return; }`
- `28: if (!Number.isFinite(numericCalories) || numericCalories < 0 || optional.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) { setError(t('formInvalid')); return; }`
- `29: setSaving(true); setError(null);`
- `33: } catch { setError(t('saveError')); } finally { setSaving(false); }`
- `40: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText></Card>}`
- `45: <Animated.View entering={FadeInDown.delay(280).duration(300)}><Button label={saving ? t('saving') : t('saveMeal')} variant="gradient" icon="check_circle" loading={saving} onPress={save} /></Animated.View>`
- `51: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }, titleWrap: { flex: 1, alignItems: 'center'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
