import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type ChronicMedication = { id: string; name?: string; dose?: string; frequency?: string; pills_remaining?: number | null; refill_date?: string | null; days_until_refill?: number | null; needs_refill_soon?: boolean; active?: boolean };

export default function ChronicMedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [items, setItems] = React.useState<ChronicMedication[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/health/chronic-meds'); const rows = Array.isArray(response) ? response : response?.data; setItems(Array.isArray(rows) ? rows : []); }
    catch { setError('تعذر تحميل الأدوية المزمنة.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {
    setAction(`${kind}-${id}`); setError(null);
    try {
      const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';
      await apiFetch(`/health/reminders/${id}${suffix}`, { method: 'POST', body: kind === 'snooze' ? JSON.stringify({ days: 3 }) : undefined });
      await load();
    } catch {
      setError(kind === 'refill' ? 'تعذر بدء طلب إعادة التعبئة. تحقق من عنوان التوصيل ولا تعتبر الطلب مكتملًا قبل تأكيده.' : 'تعذر تحديث متابعة إعادة التعبئة.');
    } finally { setAction(null); }
  };

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label="إضافة" variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><AppText variant="h3">الأدوية المزمنة</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل الأدوية المزمنة…</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Card style={[styles.notice, { backgroundColor: colors.infoSurface }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">تساعدك هذه الصفحة على متابعة السجل وإعادة التعبئة. لا تنشئ طلباً تلقائياً ولا تعدل وصفة أو جرعة. تأكد من تفاصيل الطلب والعنوان قبل تأكيده.</AppText></Card>
      {error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}
      {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد أدوية مزمنة نشطة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف تذكيراً وحدد «دواء مزمن» إذا كان ذلك مناسباً لوصفتك.</AppText><Button label="إضافة تذكير" variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
      {items.map((item) => <Card key={item.id} style={styles.item}><View style={styles.row}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{item.name || 'دواء غير مسمى'}</AppText><AppText variant="bodyXS" color={colors.textTertiary}>{item.dose || 'الجرعة غير مسجلة'} · {item.frequency === 'daily' ? 'يومياً' : item.frequency === 'weekly' ? 'أسبوعياً' : 'عند الحاجة'}</AppText></View><Badge label="مزمن" color={colors.warning} /></View><RefillState item={item} colors={colors} />{item.needs_refill_soon && <Button label="بدء طلب إعادة تعبئة" variant="primary" icon="shopping_cart" loading={action === `refill-${item.id}`} onPress={() => run(item.id, 'refill')} />}<View style={styles.actions}><Button label="تأجيل 3 أيام" variant="outline" size="sm" full={false} loading={action === `snooze-${item.id}`} onPress={() => run(item.id, 'snooze')} /><Button label="إيقاف متابعة الإعادة" variant="ghost" size="sm" full={false} loading={action === `cancel-${item.id}`} onPress={() => run(item.id, 'cancel')} /></View></Card>)}
    </ScrollView>}
  </View>;
}

function RefillState({ item, colors }: { item: ChronicMedication; colors: any }) {
  if (item.refill_date) return <View style={styles.refill}><AppText variant="labelSM" color={item.needs_refill_soon ? colors.warning : colors.textSecondary}>{item.needs_refill_soon ? 'تحتاج متابعة إعادة التعبئة قريباً' : 'موعد متابعة إعادة التعبئة'}</AppText><AppText variant="caption" color={colors.textTertiary}>{item.days_until_refill == null ? String(item.refill_date).slice(0, 10) : `متبقي ${item.days_until_refill} يوم`}</AppText></View>;
  if (item.pills_remaining != null) return <View style={styles.refill}><AppText variant="labelSM" color={colors.textSecondary}>المتبقي المدوّن</AppText><AppText variant="caption" color={colors.textTertiary}>{item.pills_remaining} وحدة</AppText></View>;
  return <View style={styles.refill}><AppText variant="caption" color={colors.textTertiary}>لم تسجل معلومات مخزون أو تاريخ متابعة لإعادة التعبئة.</AppText></View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, content: { padding: 16, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, notice: { alignItems: 'flex-end' }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8 }, empty: { gap: 12, alignItems: 'flex-end', padding: 20 }, item: { gap: 12 }, row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, refill: { alignItems: 'flex-end', gap: 2 }, actions: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8 } });
