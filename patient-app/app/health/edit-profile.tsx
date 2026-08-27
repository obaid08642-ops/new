import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type Draft = { blood_type: string; height_cm: string; weight_kg: string; gender: string; is_pregnant: boolean; is_breastfeeding: boolean; is_smoker: boolean };
const initial: Draft = { blood_type: 'unknown', height_cm: '', weight_kg: '', gender: 'unspecified', is_pregnant: false, is_breastfeeding: false, is_smoker: false };

export default function EditMedicalProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [draft, setDraft] = React.useState<Draft>(initial);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [medicalResponse, userResponse]: any[] = await Promise.all([apiFetch('/medical-profile'), apiFetch('/users/me/profile')]);
      const profile = medicalResponse?.data || medicalResponse || {};
      const user = userResponse?.data || userResponse || {};
      setDraft({ blood_type: profile.blood_type || 'unknown', height_cm: profile.height_cm == null ? '' : String(profile.height_cm), weight_kg: profile.weight_kg == null ? '' : String(profile.weight_kg), gender: profile.gender || 'unspecified', is_pregnant: Boolean(profile.is_pregnant), is_breastfeeding: Boolean(profile.is_breastfeeding), is_smoker: Boolean(profile.is_smoker) });
      setAvatarUrl(user.avatar_url || null);
    } catch { setError('تعذر تحميل الملف الصحي.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    const height_cm = draft.height_cm.trim() ? Number(draft.height_cm) : undefined;
    const weight_kg = draft.weight_kg.trim() ? Number(draft.weight_kg) : undefined;
    if ((height_cm !== undefined && (!Number.isFinite(height_cm) || height_cm < 40 || height_cm > 260)) || (weight_kg !== undefined && (!Number.isFinite(weight_kg) || weight_kg < 1 || weight_kg > 1000))) { setError('تحقق من الطول والوزن قبل الحفظ.'); return; }
    setSaving(true); setError(null);
    try { await apiFetch('/medical-profile', { method: 'PATCH', body: JSON.stringify({ ...draft, height_cm, weight_kg }) }); router.back(); }
    catch { setError('تعذر حفظ الملف الصحي. لم يتم تغيير بياناتك.'); }
    finally { setSaving(false); }
  };

  const pickAvatar = async () => {
    setUploading(true); setError(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('يلزم منح إذن الصور لتغيير الصورة الشخصية.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      formData.append('folder', 'avatars');
      const upload: any = await apiFetch('/media/upload', { method: 'POST', body: formData });
      const url = upload?.url || upload?.data?.url;
      if (!url) throw new Error('upload_missing_url');
      await apiFetch('/users/me/profile', { method: 'PATCH', body: JSON.stringify({ avatar_url: url }) });
      setAvatarUrl(url);
    } catch { setError('تعذر رفع الصورة الشخصية.'); }
    finally { setUploading(false); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">الملف الصحي</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل الملف…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Card style={styles.avatar}><View style={{ alignItems: 'center', gap: 8 }}><View style={[styles.avatarFrame, { backgroundColor: colors.surfaceSecondary }]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <AppText variant="h4" color={colors.textTertiary}>صورة</AppText>}</View><Button label={uploading ? 'جارٍ رفع الصورة' : 'تغيير الصورة'} variant="outline" size="sm" full={false} loading={uploading} onPress={pickAvatar} /></View><AppText variant="caption" color={colors.textTertiary} align="right">تُحفظ الصورة الشخصية في ملف المستخدم، بينما المعلومات أدناه تُحفظ في الملف الطبي.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      <Card style={styles.section}><AppText variant="h6" align="right">المعلومات الصحية الأساسية</AppText><AppText variant="caption" color={colors.textTertiary} align="right">فصيلة الدم</AppText><SegmentedControl value={draft.blood_type} onChange={(blood_type) => setDraft((state) => ({ ...state, blood_type }))} options={['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((key) => ({ key, label: key === 'unknown' ? 'غير معروف' : key }))} /><Input value={draft.height_cm} onChangeText={(height_cm) => setDraft((state) => ({ ...state, height_cm }))} placeholder="الطول بالسنتيمتر" keyboardType="numeric" /><Input value={draft.weight_kg} onChangeText={(weight_kg) => setDraft((state) => ({ ...state, weight_kg }))} placeholder="الوزن بالكيلوغرام" keyboardType="numeric" /><AppText variant="caption" color={colors.textTertiary} align="right">النوع</AppText><SegmentedControl value={draft.gender} onChange={(gender) => setDraft((state) => ({ ...state, gender }))} options={[{ key: 'unspecified', label: 'لا أريد التحديد' }, { key: 'female', label: 'أنثى' }, { key: 'male', label: 'ذكر' }]} /></Card>
      <Card style={styles.section}><AppText variant="h6" align="right">معلومات اختيارية</AppText><BooleanRow label="متابعة حمل حالياً" value={draft.is_pregnant} onChange={(is_pregnant) => setDraft((state) => ({ ...state, is_pregnant }))} /><BooleanRow label="الرضاعة الطبيعية" value={draft.is_breastfeeding} onChange={(is_breastfeeding) => setDraft((state) => ({ ...state, is_breastfeeding }))} /><BooleanRow label="التدخين حالياً" value={draft.is_smoker} onChange={(is_smoker) => setDraft((state) => ({ ...state, is_smoker }))} /></Card>
      <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ alignItems: 'flex-end', flex: 1 }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>إضافة وحذف العناصر من الشاشة المخصصة</AppText></View></Card><Button label="حفظ الملف الصحي" variant="gradient" icon="check_circle" loading={saving} onPress={save} />
    </ScrollView>}
  </View>;
}

function BooleanRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.boolean}><AppText variant="bodySM" align="right">{label}</AppText><SegmentedControl value={value ? 'yes' : 'no'} onChange={(key) => onChange(key === 'yes')} options={[{ key: 'no', label: 'لا' }, { key: 'yes', label: 'نعم' }]} /></View>; }

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, avatar: { alignItems: 'center', gap: 10 }, avatarFrame: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: '100%', height: '100%' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, section: { gap: 12 }, boolean: { alignItems: 'flex-end', gap: 8 }, link: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 72 } });
