import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type Reminder = { id: string; medicine_name_ar?: string; medicine_name_en?: string; today_doses?: Array<{ status: string }>; times?: string[]; chronic?: boolean };

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/health/reminders'); const rows = Array.isArray(response) ? response : response?.data; setReminders(Array.isArray(rows) ? rows : []); }
    catch { setError('تعذر تحميل ملخص الأدوية.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const scheduled = reminders.reduce((sum, item) => sum + (item.today_doses?.length || item.times?.length || 0), 0);
  const taken = reminders.reduce((sum, item) => sum + (item.today_doses || []).filter((dose) => dose.status === 'taken').length, 0);
  const chronic = reminders.filter((item) => item.chronic).length;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">أدويتي</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل ملخص الأدوية…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Card style={[styles.summary, { backgroundColor: colors.primarySurface }]}><AppText variant="h3" color={colors.primary}>{taken} / {scheduled || 0}</AppText><AppText variant="bodySM" color={colors.textSecondary}>جرعات اليوم المسجلة كـ «تم أخذها»</AppText><AppText variant="caption" color={colors.textTertiary}>سجل النتيجة كما حدثت؛ التطبيق لا يعدل الجرعة أو يقرر العلاج.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      <MenuCard title="تذكيرات اليوم" detail={reminders.length ? `${reminders.length} تذكير نشط` : 'لا توجد تذكيرات نشطة'} action="عرض التذكيرات" onPress={() => router.push('/health/medication-reminder-list')} />
      <MenuCard title="إضافة تذكير" detail="أضف الدواء والجرعة الموصوفة والمواعيد والمنطقة الزمنية" action="إضافة" onPress={() => router.push('/health/medication-reminder-add')} />
      <MenuCard title="الأدوية المزمنة" detail={chronic ? `${chronic} دواء مزمن مع متابعة إعادة التعبئة` : 'اعرض فقط الأدوية التي حددتها مزمنة'} action="إدارة" onPress={() => router.push('/health/chronic-medications')} />
      <MenuCard title="الوصفات الطبية" detail="استعرض الوصفات الصادرة من مقدمي الرعاية" action="عرض الوصفات" onPress={() => router.push('/health/prescriptions')} />
    </ScrollView>}
  </View>;
}

function MenuCard({ title, detail, action, onPress }: { title: string; detail: string; action: string; onPress: () => void }) { const { colors } = useApp(); return <Card style={styles.menu}><View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}><AppText variant="h6">{title}</AppText><AppText variant="caption" color={colors.textTertiary} align="right">{detail}</AppText></View><Button label={action} variant="outline" size="sm" full={false} onPress={onPress} /></Card>; }

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, summary: { alignItems: 'flex-end', gap: 4 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, menu: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 } });
