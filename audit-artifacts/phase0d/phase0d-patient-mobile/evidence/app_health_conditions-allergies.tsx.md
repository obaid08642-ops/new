# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/conditions-allergies.tsx`
- **Member SHA-256:** `d70f0c111035eaa026c7e11e36671e7faf57d6029a01f6f33f2bf7472463f9d3`
- **Line count:** 61
- **Read range:** `1-61`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `13: export default function ConditionsAllergiesScreen() {`
- `47: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">الأمراض والحساسية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => rou`
- `50: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `58: return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placeholder} /><Button label={addLabel} variant="outline" size="sm" full={false} loading={add`
### backend_consumers_or_contracts
- `25: try { const response: any = await apiFetch('/medical-profile'); const doc = response?.data || response || {}; setProfile({ chronic_diseases: Array.isArray(doc.chronic_diseases) ? doc.chronic_diseases : [], allergies: Array.isArray(doc.aller`
- `34: try { await apiFetch(`/medical-profile/${list}`, { method: 'POST', body: JSON.stringify({ name }) }); list === 'allergies' ? setAllergy('') : setCondition(''); await load(); }`
- `40: try { await apiFetch(`/medical-profile/${list}/${id}`, { method: 'DELETE' }); await load(); }`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';`
- `16: const [profile, setProfile] = React.useState<Profile>({});`
- `17: const [condition, setCondition] = React.useState('');`
- `18: const [allergy, setAllergy] = React.useState('');`
- `19: const [loading, setLoading] = React.useState(true);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `21: const [action, setAction] = React.useState<string | null>(null);`
- `24: setLoading(true); setError(null);`
- `26: catch { setError('تعذر تحميل الملف الطبي.'); }`
- `27: finally { setLoading(false); }`
- `32: const name = value.trim(); if (!name) { setError('اكتب الاسم قبل الإضافة.'); return; }`
- `33: setAction(`add-${list}`); setError(null);`
### payment_insurance_relevance
- `6: import { AppText, Card, Button, IconButton, Input } from '../../src/components/ui';`
- `49: <Card style={[styles.notice, { backgroundColor: colors.warningSurface }]}><AppText variant="caption" color={colors.textSecondary} align="right">تُحفظ العناصر التي تدخلها في ملفك الطبي. لا تعتبر هذه الشاشة تشخيصاً ولا بديلاً عن الرعاية المهن`
- `50: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `58: return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placeholder} /><Button label={addLabel} variant="outline" size="sm" full={false} loading={add`
### error_empty_loading_retry_cancel
- `19: const [loading, setLoading] = React.useState(true);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `24: setLoading(true); setError(null);`
- `26: catch { setError('تعذر تحميل الملف الطبي.'); }`
- `27: finally { setLoading(false); }`
- `32: const name = value.trim(); if (!name) { setError('اكتب الاسم قبل الإضافة.'); return; }`
- `33: setAction(`add-${list}`); setError(null);`
- `35: catch { setError('تعذر حفظ العنصر في الملف الطبي.'); }`
- `39: setAction(`delete-${id}`); setError(null);`
- `41: catch { setError('تعذر حذف العنصر من الملف الطبي.'); }`
- `48: {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل الملف الطبي…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddin`
- `50: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
