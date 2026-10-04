import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton, Input, SegmentedControl } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type VitalType = 'bp' | 'glucose' | 'heart_rate' | 'weight' | 'temperature' | 'spo2';
type Reading = { id: string; type: VitalType; value: string; unit?: string; measured_at?: string; context?: string | null };
const TYPES: Array<{ key: VitalType; label: string; unit: string; color: string }> = [
  { key: 'bp', label: 'ضغط الدم', unit: 'mmHg', color: '#23B5CE' }, { key: 'glucose', label: 'سكر الدم', unit: 'mg/dL', color: '#7A6BEA' },
  { key: 'heart_rate', label: 'نبض القلب', unit: 'bpm', color: '#F0695C' }, { key: 'weight', label: 'الوزن', unit: 'kg', color: '#16A34A' },
  { key: 'temperature', label: 'درجة الحرارة', unit: '°C', color: '#F97316' }, { key: 'spo2', label: 'أكسجين الدم', unit: '%', color: '#06B6D4' },
];
const displayDate = (value?: string) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('ar-SA') : 'تاريخ غير متاح'; };

export default function VitalsLogScreen() {
  const params = useLocalSearchParams<{ type?: VitalType }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [type, setType] = React.useState<VitalType>(TYPES.some((item) => item.key === params.type) ? params.type as VitalType : 'bp');
  const [readings, setReadings] = React.useState<Reading[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [primary, setPrimary] = React.useState('');
  const [secondary, setSecondary] = React.useState('');
  const [context, setContext] = React.useState('morning');

  const config = TYPES.find((item) => item.key === type)!;
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch(`/health/vitals?type=${type}&limit=30`); const rows = Array.isArray(response) ? response : response?.data; setReadings(Array.isArray(rows) ? rows : []); }
    catch { setError('تعذر تحميل سجل القراءات.'); }
    finally { setLoading(false); }
  }, [type]);
  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!primary.trim() || (type === 'bp' && !secondary.trim())) { setError('أدخل قيمة القراءة المطلوبة قبل الحفظ.'); return; }
    setSaving(true); setError(null);
    try {
      const payload: any = { type, context, source: 'manual' };
      if (type === 'bp') { payload.systolic = Number(primary); payload.diastolic = Number(secondary); }
      else payload.value = Number(primary);
      await apiFetch('/health/vitals', { method: 'POST', body: JSON.stringify(payload) });
      setPrimary(''); setSecondary(''); setShowForm(false); await load();
    } catch { setError('تعذر حفظ القراءة. تحقق من القيمة وحاول مجدداً.'); }
    finally { setSaving(false); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label="إضافة" variant="ghost" size="sm" icon="add" full={false} onPress={() => setShowForm(true)} /><AppText variant="h3">سجل القراءات</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.types}>{TYPES.map((item) => <TouchableOpacity key={item.key} onPress={() => setType(item.key)} style={[styles.type, { backgroundColor: type === item.key ? item.color : colors.surfaceSecondary, borderColor: type === item.key ? item.color : colors.border }]}><AppText variant="labelSM" color={type === item.key ? '#fff' : colors.textPrimary}>{item.label}</AppText></TouchableOpacity>)}</View>
      <Card style={[styles.notice, { backgroundColor: colors.primarySurface }]}><AppText variant="caption" color={colors.textSecondary} align="right">يعرض السجل القراءات التي حفظتها فقط. لا يحسب التطبيق تشخيصاً أو حكماً طبياً من هذه الأرقام.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل السجل…</AppText></View> : readings.length === 0 ? <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات لهذا المؤشر</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">لن نرسم اتجاهاً أو متوسطاً قبل وجود بيانات فعلية.</AppText><Button label="إضافة قراءة" variant="gradient" onPress={() => setShowForm(true)} /></Card> : <><AppText variant="bodySM" color={colors.textTertiary} align="right">آخر {readings.length} قراءة محفوظة</AppText>{readings.map((reading) => <Card key={reading.id} style={styles.reading}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h5" color={config.color}>{reading.value} {reading.unit || config.unit}</AppText><AppText variant="caption" color={colors.textTertiary}>{displayDate(reading.measured_at)}{reading.context ? ` · ${reading.context}` : ''}</AppText></View></Card>)}</>}
    </ScrollView>
    {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={styles.sheetHeader}><View style={{ width: 36 }} /><AppText variant="h4">إضافة {config.label}</AppText><IconButton icon="close" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => setShowForm(false)} /></View>{type === 'bp' ? <View style={styles.bp}><Input value={primary} onChangeText={setPrimary} placeholder="الانقباضي" keyboardType="numeric" style={{ flex: 1 }} /><Input value={secondary} onChangeText={setSecondary} placeholder="الانبساطي" keyboardType="numeric" style={{ flex: 1 }} /></View> : <Input value={primary} onChangeText={setPrimary} placeholder={`القراءة (${config.unit})`} keyboardType="numeric" />}<SegmentedControl value={context} onChange={setContext} options={[{ key: 'morning', label: 'صباحاً' }, { key: 'afternoon', label: 'ظهراً' }, { key: 'evening', label: 'مساءً' }]} /><Button label="حفظ القراءة" variant="gradient" icon="check_circle" loading={saving} onPress={save} /></View></View>}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, types: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }, type: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, borderWidth: 1 }, notice: { alignItems: 'flex-end' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, center: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 }, empty: { gap: 12, alignItems: 'flex-end', padding: 20 }, reading: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 72 }, overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', padding: 16 }, sheet: { borderRadius: 24, padding: 16, gap: 14 }, sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }, bp: { flexDirection: 'row-reverse', gap: 10 } });
