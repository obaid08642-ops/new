# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/vitals-log.tsx`
- **Member SHA-256:** `bbc0288d2d3bf15d89464a704fa44cea962fa66ad974c58e9eeab43162407d56`
- **Line count:** 67
- **Read range:** `1-67`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router, useLocalSearchParams } from 'expo-router';`
- `18: export default function VitalsLogScreen() {`
- `56: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label="إضافة" variant="ghost" size="sm" icon="add" full={false} onPress={() => setShowForm(true)} /><AppText variant="h3">سجل القراءات</AppText><IconButton icon="back" b`
- `58: <View style={styles.types}>{TYPES.map((item) => <TouchableOpacity key={item.key} onPress={() => setType(item.key)} style={[styles.type, { backgroundColor: type === item.key ? item.color : colors.surfaceSecondary, borderColor: type === item.`
- `60: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `61: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل السجل…</AppText></View> : readings.length === 0 ? <Card style={styles.empty}><AppText varian`
- `63: {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={styles.sheetHeader}><View style={{ width: 36 }} /><AppText variant="h4">إضافة {c`
### backend_consumers_or_contracts
- `35: try { const response: any = await apiFetch(`/health/vitals?type=${type}&limit=30`); const rows = Array.isArray(response) ? response : response?.data; setReadings(Array.isArray(rows) ? rows : []); }`
- `48: await apiFetch('/health/vitals', { method: 'POST', body: JSON.stringify(payload) });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';`
- `22: const [type, setType] = React.useState<VitalType>(TYPES.some((item) => item.key === params.type) ? params.type as VitalType : 'bp');`
- `23: const [readings, setReadings] = React.useState<Reading[]>([]);`
- `24: const [loading, setLoading] = React.useState(true);`
- `25: const [saving, setSaving] = React.useState(false);`
- `26: const [error, setError] = React.useState<string | null>(null);`
- `27: const [showForm, setShowForm] = React.useState(false);`
- `28: const [primary, setPrimary] = React.useState('');`
- `29: const [secondary, setSecondary] = React.useState('');`
- `30: const [context, setContext] = React.useState('morning');`
- `34: setLoading(true); setError(null);`
- `36: catch { setError('تعذر تحميل سجل القراءات.'); }`
### payment_insurance_relevance
- `6: import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `45: const payload: any = { type, context, source: 'manual' };`
- `46: if (type === 'bp') { payload.systolic = Number(primary); payload.diastolic = Number(secondary); }`
- `47: else payload.value = Number(primary);`
- `48: await apiFetch('/health/vitals', { method: 'POST', body: JSON.stringify(payload) });`
- `59: <Card style={[styles.notice, { backgroundColor: colors.primarySurface }]}><AppText variant="caption" color={colors.textSecondary} align="right">يعرض السجل القراءات التي حفظتها فقط. لا يحسب التطبيق تشخيصاً أو حكماً طبياً من هذه الأرقام.</App`
- `60: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `61: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل السجل…</AppText></View> : readings.length === 0 ? <Card style={styles.empty}><AppText varian`
### error_empty_loading_retry_cancel
- `24: const [loading, setLoading] = React.useState(true);`
- `26: const [error, setError] = React.useState<string | null>(null);`
- `34: setLoading(true); setError(null);`
- `36: catch { setError('تعذر تحميل سجل القراءات.'); }`
- `37: finally { setLoading(false); }`
- `42: if (!primary.trim() || (type === 'bp' && !secondary.trim())) { setError('أدخل قيمة القراءة المطلوبة قبل الحفظ.'); return; }`
- `43: setSaving(true); setError(null);`
- `50: } catch { setError('تعذر حفظ القراءة. تحقق من القيمة وحاول مجدداً.'); }`
- `60: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `61: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل السجل…</AppText></View> : readings.length === 0 ? <Card style={styles.empty}><AppText varian`
- `63: {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={styles.sheetHeader}><View style={{ width: 36 }} /><AppText variant="h4">إضافة {c`
- `67: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, types: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
