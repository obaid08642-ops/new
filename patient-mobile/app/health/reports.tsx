import React from 'react';
import { View, StyleSheet, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type Report = { id: string; date?: string | null; title?: string | null; doctor?: string | null; facility?: string | null; type?: string | null; critical?: boolean; has_attachments?: boolean };

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { const response: any = await apiFetch('/health/reports'); const rows = Array.isArray(response) ? response : response?.data; setReports(Array.isArray(rows) ? rows : []); }
    catch { setError('تعذر تحميل التقارير الصحية.'); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><View style={{ width: 44 }} /><AppText variant="h3">تقاريري الصحية</AppText><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><AppText variant="bodySM" color={colors.textTertiary}>جارٍ تحميل التقارير…</AppText></View> : <FlatList data={reports} keyExtractor={(item) => item.id} contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]} ListHeaderComponent={<>{error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={load} /></Card>}{!error && reports.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد تقارير متاحة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">عند إصدار تقرير مرتبط بحسابك سيظهر هنا. لا تُعرض درجات أو ملخصات غير موجودة في بيانات التقرير.</AppText></Card>}</>} renderItem={({ item }) => <Card style={styles.report}><View style={styles.row}><View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}><AppText variant="h6">{item.title || 'تقرير صحي'}</AppText>{item.type && <AppText variant="caption" color={colors.textTertiary}>{item.type}</AppText>}{item.doctor && <AppText variant="caption" color={colors.textTertiary}>{item.doctor}</AppText>}{item.facility && <AppText variant="caption" color={colors.textTertiary}>{item.facility}</AppText>}<AppText variant="caption" color={colors.textTertiary}>{item.date || 'تاريخ الإصدار غير متاح'}</AppText></View>{item.critical && <Badge label="تنبيه من التقرير" color={colors.warning} />}</View>{item.has_attachments && <AppText variant="caption" color={colors.textTertiary} align="right">يتضمن التقرير مرفقات متاحة من مقدم الخدمة.</AppText>}</Card>} />}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, list: { padding: 16, gap: 14 }, error: { backgroundColor: '#FEE2E2', alignItems: 'flex-end', gap: 8, marginBottom: 14 }, empty: { alignItems: 'flex-end', gap: 10, padding: 20, marginBottom: 14 }, report: { gap: 8 }, row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 } });
