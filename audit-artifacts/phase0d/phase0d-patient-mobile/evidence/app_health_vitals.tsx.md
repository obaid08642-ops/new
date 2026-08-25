# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/vitals.tsx`
- **Member SHA-256:** `e28f1ae977a28b4ed32fe284f675054eff9ee0668f8ada3e0d001d205f0ac050`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `17: export default function VitalsScreen() {`
- `39: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">مؤشراتي الحيوية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => route`
- `42: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `43: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم و`
- `44: <View style={styles.grid}>{items.map((item) => <Card key={item.key} onPress={() => router.push({ pathname: '/health/vitals-log', params: { type: item.key } } as any)} style={styles.vital}><View style={{ alignItems: 'flex-end', gap: 5 }}><Ap`
- `45: <Button label="إضافة قراءة جديدة" variant="gradient" icon="add" onPress={() => router.push('/health/vitals-log')} />`
- `46: {items.length > 0 && <Button label="عرض السجل" variant="outline" onPress={() => router.push('/health/vitals-log')} />}`
- `47: <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ flex: 1, alignItems: 'flex-end' }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>`
### backend_consumers_or_contracts
- `27: const response: any = await apiFetch('/health/vitals/summary');`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `20: const [items, setItems] = React.useState<VitalSummary[]>([]);`
- `21: const [loading, setLoading] = React.useState(true);`
- `22: const [error, setError] = React.useState<string | null>(null);`
- `25: setLoading(true); setError(null);`
- `31: setError('تعذر تحميل المؤشرات الحيوية. تحقق من الاتصال ثم أعد المحاولة.');`
- `32: } finally { setLoading(false); }`
- `38: <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />`
- `40: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل قراءاتك…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBot`
- `42: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `43: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم و`
- `52: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: `
### payment_insurance_relevance
- `6: import { AppText, Card, Button, IconButton } from '../../src/components/ui';`
- `41: <Card style={[styles.notice, { backgroundColor: colors.primarySurface }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">تُعرض هنا آخر قراءة مسجلة لكل مؤشر فقط. لا تمثل النتيجة تشخيصاً طبياً.</AppText></Card>`
- `42: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `43: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم و`
- `44: <View style={styles.grid}>{items.map((item) => <Card key={item.key} onPress={() => router.push({ pathname: '/health/vitals-log', params: { type: item.key } } as any)} style={styles.vital}><View style={{ alignItems: 'flex-end', gap: 5 }}><Ap`
- `47: <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ flex: 1, alignItems: 'flex-end' }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>`
### error_empty_loading_retry_cancel
- `21: const [loading, setLoading] = React.useState(true);`
- `22: const [error, setError] = React.useState<string | null>(null);`
- `25: setLoading(true); setError(null);`
- `30: } catch {`
- `31: setError('تعذر تحميل المؤشرات الحيوية. تحقق من الاتصال ثم أعد المحاولة.');`
- `32: } finally { setLoading(false); }`
- `40: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل قراءاتك…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBot`
- `42: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `43: {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم و`
- `52: const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
