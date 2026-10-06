// @ts-nocheck
// app/insurance/benefits-summary.tsx
// F2 (PRODUCT.md): Nabd+ does not approve claims or hold annual limits. This
// shows the patient's insurance requests per service exactly as the providers
// decided them (GET /insurance/benefits-summary), plus the copay paid / due.
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../src/context/AppContext';
import { Icon } from '../../../src/components/Icon';
import { AppText } from '../../../src/components/ui';
import { ScreenState } from '../../../src/components/ScreenStates';
import { apiFetch } from '../../../src/utils/api';

const SERVICE_LABELS: Record<string, string> = {
  consultation: 'استشارات',
  pharmacy: 'صيدلية',
  lab: 'تحاليل',
  radiology: 'أشعة',
  nursing: 'تمريض منزلي',
};

export default function InsuranceBenefitsView() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch('/insurance/benefits-summary')
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch(() => setError('تعذر تحميل طلبات التأمين'))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h4" color="#fff">طلبات التأمين</AppText>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScreenState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyTitle="لا توجد طلبات تأمين بعد"
        emptySubtitle="عند الحجز بالتأمين يطلب مقدم الخدمة الموافقة ويظهر قراره هنا"
        onRetry={load}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {rows.map((b) => (
            <View key={b.service} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <AppText variant="h6" color={colors.textPrimary}>{SERVICE_LABELS[b.service] || b.service}</AppText>
                <View style={[styles.iconWrap, { backgroundColor: colors.primarySurface }]}>
                  <Icon name={b.icon as any} size={18} color={colors.primary} />
                </View>
              </View>
              <View style={styles.statsRow}>
                <Stat label="الطلبات" value={b.requests} colors={colors} />
                <Stat label="موافقة" value={b.approved} colors={colors} />
                <Stat label="جزئية" value={b.partially_approved} colors={colors} />
                <Stat label="مرفوضة" value={b.rejected} colors={colors} />
                <Stat label="قيد المراجعة" value={b.pending} colors={colors} />
              </View>
              {(b.copay_paid > 0 || b.copay_due > 0) && (
                <View style={styles.copayRow}>
                  {b.copay_paid > 0 && <AppText variant="caption" color={colors.textSecondary}>نسبة تحمل مدفوعة: {b.copay_paid} ر.س</AppText>}
                  {b.copay_due > 0 && <AppText variant="caption" color={colors.warning}>نسبة تحمل مستحقة: {b.copay_due} ر.س</AppText>}
                </View>
              )}
            </View>
          ))}
          <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
            نبض+ لا يعتمد المطالبات؛ القرار من مقدم الخدمة بعد موافقة شركة التأمين.
          </AppText>
        </ScrollView>
      </ScreenState>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.stat}>
      <AppText variant="labelMD" color={colors.textPrimary}>{value}</AppText>
      <AppText variant="caption" color={colors.textTertiary}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  copayRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
});
