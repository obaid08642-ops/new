# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/edit-profile.tsx`
- **Member SHA-256:** `920cb8b9dc2234f4bc12dc292e98f9de311caf45e1429d92fadc902653758927`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `12: export default function EditMedicalProfileScreen() {`
- `19: const [uploading, setUploading] = React.useState(false);`
- `40: try { await apiFetch('/medical-profile', { method: 'PATCH', body: JSON.stringify({ ...draft, height_cm, weight_kg }) }); router.back(); }`
- `46: setUploading(true); setError(null);`
- `52: if (result.canceled || !result.assets?.[0]) return;`
- `57: const upload: any = await apiFetch('/media/upload', { method: 'POST', body: formData });`
- `58: const url = upload?.url || upload?.data?.url;`
- `59: if (!url) throw new Error('upload_missing_url');`
- `63: finally { setUploading(false); }`
- `68: <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">الملف الصحي</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.ba`
- `70: <Card style={styles.avatar}><View style={{ alignItems: 'center', gap: 8 }}><View style={[styles.avatarFrame, { backgroundColor: colors.surfaceSecondary }]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <App`
### backend_consumers_or_contracts
- `25: const [medicalResponse, userResponse]: any[] = await Promise.all([apiFetch('/medical-profile'), apiFetch('/users/me/profile')]);`
- `40: try { await apiFetch('/medical-profile', { method: 'PATCH', body: JSON.stringify({ ...draft, height_cm, weight_kg }) }); router.back(); }`
- `57: const upload: any = await apiFetch('/media/upload', { method: 'POST', body: formData });`
- `60: await apiFetch('/users/me/profile', { method: 'PATCH', body: JSON.stringify({ avatar_url: url }) });`
### auth_ownership
- `49: const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();`
- `50: if (!permission.granted) { setError('يلزم منح إذن الصور لتغيير الصورة الشخصية.'); return; }`
### state_transitions
- `2: import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Image, TouchableOpacity } from 'react-native';`
- `15: const [draft, setDraft] = React.useState<Draft>(initial);`
- `16: const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);`
- `17: const [loading, setLoading] = React.useState(true);`
- `18: const [saving, setSaving] = React.useState(false);`
- `19: const [uploading, setUploading] = React.useState(false);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `23: setLoading(true); setError(null);`
- `30: } catch { setError('تعذر تحميل الملف الصحي.'); }`
- `31: finally { setLoading(false); }`
- `38: if ((height_cm !== undefined && (!Number.isFinite(height_cm) || height_cm < 40 || height_cm > 260)) || (weight_kg !== undefined && (!Number.isFinite(weight_kg) || weight_kg < 1 || weight_kg > 1000))) { setError('تحقق من الطول والوزن قبل الح`
- `39: setSaving(true); setError(null);`
### payment_insurance_relevance
- `6: import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';`
- `70: <Card style={styles.avatar}><View style={{ alignItems: 'center', gap: 8 }}><View style={[styles.avatarFrame, { backgroundColor: colors.surfaceSecondary }]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <App`
- `71: {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}`
- `72: <Card style={styles.section}><AppText variant="h6" align="right">المعلومات الصحية الأساسية</AppText><AppText variant="caption" color={colors.textTertiary} align="right">فصيلة الدم</AppText><SegmentedControl value={draft.blood_type} onChange`
- `73: <Card style={styles.section}><AppText variant="h6" align="right">معلومات اختيارية</AppText><BooleanRow label="متابعة حمل حالياً" value={draft.is_pregnant} onChange={(is_pregnant) => setDraft((state) => ({ ...state, is_pregnant }))} /><Boole`
- `74: <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ alignItems: 'flex-end', flex: 1 }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>`
### error_empty_loading_retry_cancel
- `17: const [loading, setLoading] = React.useState(true);`
- `19: const [uploading, setUploading] = React.useState(false);`
- `20: const [error, setError] = React.useState<string | null>(null);`
- `23: setLoading(true); setError(null);`
- `30: } catch { setError('تعذر تحميل الملف الصحي.'); }`
- `31: finally { setLoading(false); }`
- `38: if ((height_cm !== undefined && (!Number.isFinite(height_cm) || height_cm < 40 || height_cm > 260)) || (weight_kg !== undefined && (!Number.isFinite(weight_kg) || weight_kg < 1 || weight_kg > 1000))) { setError('تحقق من الطول والوزن قبل الح`
- `39: setSaving(true); setError(null);`
- `41: catch { setError('تعذر حفظ الملف الصحي. لم يتم تغيير بياناتك.'); }`
- `46: setUploading(true); setError(null);`
- `50: if (!permission.granted) { setError('يلزم منح إذن الصور لتغيير الصورة الشخصية.'); return; }`
- `52: if (result.canceled || !result.assets?.[0]) return;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
