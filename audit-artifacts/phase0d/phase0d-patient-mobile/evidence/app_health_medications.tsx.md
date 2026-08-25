# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/medications.tsx`
- **Member SHA-256:** `e0defff9a005743d3728283015d5de0448c7367cb40db590a8c457dcbee2be06`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `13: export default function MedicationsScreen() {`
- `37: <Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} />`
- `39: <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `50: {error && <Animated.View entering={FadeInDown.duration(280)}><Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={lo`
- `51: <Animated.View entering={FadeInDown.delay(80).duration(360)}><NavigationCard title={t('remindersToday')} detail={reminders.length ? t('activeReminders', { count: reminders.length }) : t('noActiveReminders')} action={t('viewReminders')} tint`
- `52: <Animated.View entering={FadeInDown.delay(150).duration(360)}><NavigationCard title={t('deviceAlerts')} detail={t('deviceAlertsHint')} action={t('syncAlerts')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-`
- `53: <Animated.View entering={FadeInDown.delay(185).duration(360)}><NavigationCard title={t('addReminder')} detail={t('medicationAndDose')} action={t('add')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-add')} `
- `54: <Animated.View entering={FadeInDown.delay(255).duration(360)}><NavigationCard title={t('chronicMeds')} detail={chronic ? t('chronicCount', { count: chronic }) : t('chronicHint')} action={t('manage')} tint={colors.warning} onPress={() => rou`
- `55: <Animated.View entering={FadeInDown.delay(325).duration(360)}><NavigationCard title={t('prescriptions')} detail={t('prescriptionsHint')} action={t('viewPrescriptions')} tint={colors.info} onPress={() => router.push('/health/prescriptions')}`
- `60: function NavigationCard({ title, detail, action, tint, onPress }: { title: string; detail: string; action: string; tint: string; onPress: () => void }) {`
- `62: return <Card style={styles.navCard}><View style={[styles.tintBar, { backgroundColor: tint }]} /><View style={styles.navCopy}><AppText variant="h6">{title}</AppText><AppText variant="caption" color={colors.textTertiary}>{detail}</AppText></V`
### backend_consumers_or_contracts
- `23: try { const response: any = await apiFetch('/health/reminders'); const rows = Array.isArray(response) ? response : response?.data; setReminders(Array.isArray(rows) ? rows : []); }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `11: type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; today_doses?: Array<{ status: string }>; times?: string[]; chronic?: boolean };`
- `17: const [reminders, setReminders] = React.useState<Reminder[]>([]);`
- `18: const [loading, setLoading] = React.useState(true);`
- `19: const [error, setError] = React.useState<string | null>(null);`
- `22: setLoading(true); setError(null);`
- `24: catch { setError(t('logError')); }`
- `25: finally { setLoading(false); }`
- `30: const taken = reminders.reduce((sum, item) => sum + (item.today_doses || []).filter((dose) => dose.status === 'taken').length, 0);`
- `35: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `41: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> :`
- `50: {error && <Animated.View entering={FadeInDown.duration(280)}><Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={lo`
### payment_insurance_relevance
- `7: import { AppText, Card, Button, IconButton } from '../../src/components/ui';`
- `44: <Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '30' }]}>`
- `48: </Card>`
- `50: {error && <Animated.View entering={FadeInDown.duration(280)}><Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={lo`
- `51: <Animated.View entering={FadeInDown.delay(80).duration(360)}><NavigationCard title={t('remindersToday')} detail={reminders.length ? t('activeReminders', { count: reminders.length }) : t('noActiveReminders')} action={t('viewReminders')} tint`
- `52: <Animated.View entering={FadeInDown.delay(150).duration(360)}><NavigationCard title={t('deviceAlerts')} detail={t('deviceAlertsHint')} action={t('syncAlerts')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-`
- `53: <Animated.View entering={FadeInDown.delay(185).duration(360)}><NavigationCard title={t('addReminder')} detail={t('medicationAndDose')} action={t('add')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-add')} `
- `54: <Animated.View entering={FadeInDown.delay(255).duration(360)}><NavigationCard title={t('chronicMeds')} detail={chronic ? t('chronicCount', { count: chronic }) : t('chronicHint')} action={t('manage')} tint={colors.warning} onPress={() => rou`
- `55: <Animated.View entering={FadeInDown.delay(325).duration(360)}><NavigationCard title={t('prescriptions')} detail={t('prescriptionsHint')} action={t('viewPrescriptions')} tint={colors.info} onPress={() => router.push('/health/prescriptions')}`
- `60: function NavigationCard({ title, detail, action, tint, onPress }: { title: string; detail: string; action: string; tint: string; onPress: () => void }) {`
- `62: return <Card style={styles.navCard}><View style={[styles.tintBar, { backgroundColor: tint }]} /><View style={styles.navCopy}><AppText variant="h6">{title}</AppText><AppText variant="caption" color={colors.textTertiary}>{detail}</AppText></V`
- `65: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }`
### error_empty_loading_retry_cancel
- `18: const [loading, setLoading] = React.useState(true);`
- `19: const [error, setError] = React.useState<string | null>(null);`
- `22: setLoading(true); setError(null);`
- `24: catch { setError(t('logError')); }`
- `25: finally { setLoading(false); }`
- `41: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> :`
- `50: {error && <Animated.View entering={FadeInDown.duration(280)}><Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={lo`
- `65: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, titleWrap: { alignItems: 'center', gap: 1 }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
