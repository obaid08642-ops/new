# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/chronic-medications.tsx`
- **Member SHA-256:** `242f7c413ac96d189e7338a0603c0fa4522fc5258c87f2eef94bf0254776aa98`
- **Line count:** 72
- **Read range:** `1-72`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `14: export default function ChronicMedicationsScreen() {`
- `37: const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {`
- `40: const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';`
- `42: if (kind === 'refill' && response?.order_id) { router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: response.order_id } }); return; }`
- `50: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppTe`
- `53: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `54: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noChronic')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noChronicHint')}</AppText><Button label={t('addReminder')} v`
- `60: function ChronicCard({ item, colors, t, action, run }: { item: ChronicMedication; colors: any; t: any; action: string | null; run: (id: string, kind: 'refill' | 'snooze' | 'cancel') => void }) {`
- `63: return <Card style={[styles.item, { borderColor: accent + '33' }]}><View style={styles.itemHeader}><View style={[styles.supplyMark, { backgroundColor: accent + '22' }]}><AppText variant="h5" color={accent}>◼</AppText></View><View style={{ f`
### backend_consumers_or_contracts
- `25: const response: any = await apiFetch('/health/chronic-meds');`
- `41: const response: any = await apiFetch(`/health/reminders/${id}${suffix}`, { method: 'POST', body: kind === 'snooze' ? JSON.stringify({ days: 3 }) : undefined });`
- `42: if (kind === 'refill' && response?.order_id) { router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: response.order_id } }); return; }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `18: const [items, setItems] = React.useState<ChronicMedication[]>([]);`
- `19: const [loading, setLoading] = React.useState(true);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `21: const [action, setAction] = React.useState<string | null>(null);`
- `23: setLoading(true); setError(null);`
- `34: catch { setError(t('refillUpdateError')); } finally { setLoading(false); }`
- `37: const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {`
- `38: setAction(`${kind}-${id}`); setError(null);`
- `40: const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';`
- `45: catch { setError(kind === 'refill' ? t('refillError') : t('refillUpdateError')); } finally { setAction(null); }`
- `49: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
### payment_insurance_relevance
- `7: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `52: <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.notice, { backgroundColor: colors.infoSurface, borderColor: colors.info + '33' }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">{t('chronicNotic`
- `53: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `54: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noChronic')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noChronicHint')}</AppText><Button label={t('addReminder')} v`
- `55: {items.map((item, index) => <Animated.View key={item.id} entering={FadeInDown.delay(80 + index * 60).duration(340)} exiting={FadeOut.duration(150)}><ChronicCard item={item} colors={colors} t={t} action={action} run={run} /></Animated.View>)`
- `60: function ChronicCard({ item, colors, t, action, run }: { item: ChronicMedication; colors: any; t: any; action: string | null; run: (id: string, kind: 'refill' | 'snooze' | 'cancel') => void }) {`
- `63: return <Card style={[styles.item, { borderColor: accent + '33' }]}><View style={styles.itemHeader}><View style={[styles.supplyMark, { backgroundColor: accent + '22' }]}><AppText variant="h5" color={accent}>◼</AppText></View><View style={{ f`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = React.useState(true);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `23: setLoading(true); setError(null);`
- `34: catch { setError(t('refillUpdateError')); } finally { setLoading(false); }`
- `37: const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {`
- `38: setAction(`${kind}-${id}`); setError(null);`
- `40: const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';`
- `45: catch { setError(kind === 'refill' ? t('refillError') : t('refillUpdateError')); } finally { setAction(null); }`
- `51: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: `
- `53: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `54: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noChronic')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noChronicHint')}</AppText><Button label={t('addReminder')} v`
- `60: function ChronicCard({ item, colors, t, action, run }: { item: ChronicMedication; colors: any; t: any; action: string | null; run: (id: string, kind: 'refill' | 'snooze' | 'cancel') => void }) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
