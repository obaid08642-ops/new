# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/reports.tsx`
- **Member SHA-256:** `6574f0052e1e3dd7fa7e927ee524ef8cd31dbea8f3b30996a6cc46270ea91652`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `11: export default function ReportsScreen() {`
- `27: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">تقاريري الصحية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router`
- `28: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التقارير…</AppText></View> : <FlatList data={reports} keyExtractor={(item) => item.id} conte`
### backend_consumers_or_contracts
- `19: try { const response: any = await apiFetch('/health/reports'); const rows = Array.isArray(response) ? response : response?.data; setReports(Array.isArray(rows) ? rows : []); }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, FlatList, StatusBar, ActivityIndicator } from 'react-native';`
- `14: const [reports, setReports] = React.useState<Report[]>([]);`
- `15: const [loading, setLoading] = React.useState(true);`
- `16: const [error, setError] = React.useState<string | null>(null);`
- `18: setLoading(true); setError(null);`
- `20: catch { setError('تعذر تحميل التقارير الصحية.'); }`
- `21: finally { setLoading(false); }`
- `26: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `28: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التقارير…</AppText></View> : <FlatList data={reports} keyExtractor={(item) => item.id} conte`
- `32: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, center: { flex: 1, alignItems: 'center', ju`
### payment_insurance_relevance
- `6: import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';`
- `28: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التقارير…</AppText></View> : <FlatList data={reports} keyExtractor={(item) => item.id} conte`
### error_empty_loading_retry_cancel
- `15: const [loading, setLoading] = React.useState(true);`
- `16: const [error, setError] = React.useState<string | null>(null);`
- `18: setLoading(true); setError(null);`
- `20: catch { setError('تعذر تحميل التقارير الصحية.'); }`
- `21: finally { setLoading(false); }`
- `28: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التقارير…</AppText></View> : <FlatList data={reports} keyExtractor={(item) => item.id} conte`
- `32: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, center: { flex: 1, alignItems: 'center', ju`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
