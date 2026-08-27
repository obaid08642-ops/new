import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type VitalSummary = { key: string; label: string; value: string; unit: string; measured_at?: string | null; color?: string };

const arabicDate = (value?: string | null) => {
  if (!value) return 'تاريخ القراءة غير متاح';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'تاريخ القراءة غير متاح' : date.toLocaleString('ar-SA');
};

export default function VitalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [items, setItems] = React.useState<VitalSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response: any = await apiFetch('/health/vitals/summary');
      const rows = Array.isArray(response) ? response : response?.data;
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setError('تعذر تحميل المؤشرات الحيوية. تحقق من الاتصال ثم أعد المحاولة.');
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">مؤشراتي الحيوية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل قراءاتك…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Card style={[styles.notice, { backgroundColor: colors.primarySurface }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">تُعرض هنا آخر قراءة مسجلة لكل مؤشر فقط. لا تمثل النتيجة تشخيصاً طبياً.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم وجود بيانات.</AppText><Button label="إضافة قراءة" variant="gradient" icon="add" onPress={() => router.push('/health/vitals-log')} /></Card>}
      <View style={styles.grid}>{items.map((item) => <Card key={item.key} onPress={() => router.push({ pathname: '/health/vitals-log', params: { type: item.key } } as any)} style={styles.vital}><View style={{ alignItems: 'flex-end', gap: 5 }}><AppText variant="bodySM" color={colors.textSecondary}>{item.label}</AppText><View style={styles.valueRow}><AppText variant="h3" color={item.color || colors.primary}>{item.value}</AppText><AppText variant="caption" color={colors.textTertiary}>{item.unit}</AppText></View><AppText variant="caption" color={colors.textTertiary}>{arabicDate(item.measured_at)}</AppText></View></Card>)}</View>
      <Button label="إضافة قراءة جديدة" variant="gradient" icon="add" onPress={() => router.push('/health/vitals-log')} />
      {items.length > 0 && <Button label="عرض السجل" variant="outline" onPress={() => router.push('/health/vitals-log')} />}
      <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ flex: 1, alignItems: 'flex-end' }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>تُدار من الملف الطبي المرجعي</AppText></View></Card>
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, notice: { alignItems: 'flex-end' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, empty: { alignItems: 'flex-end', gap: 12, padding: 20 }, grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, vital: { width: '48%', minHeight: 132, justifyContent: 'center' }, valueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }, link: { flexDirection: 'row-reverse', alignItems: 'center', minHeight: 72 } });
