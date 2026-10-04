// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import { Colors, Spacing as SP, BorderRadius as R } from '../../src/theme';
import { Icon as I } from '../../src/components/Icon';
import { LocalizedText } from '../../src/components/LocalizedText';

// Theme facade over the real design tokens (light palette — screen is static-styled)
const theme = {
  bg: Colors.light.background,
  surface: Colors.light.surface,
  border: Colors.light.border,
  text: Colors.light.textPrimary,
  textSub: Colors.light.textSecondary,
  primary: Colors.light.primary,
  success: Colors.light.success,
  successBg: Colors.light.successSurface,
  warning: Colors.light.warning,
  info: Colors.light.info,
};

type DoctorOrderItem = { service_id: string; name_ar?: string | null; name_en?: string | null };
type DoctorOrder = { id: string; kind: 'lab' | 'radiology' | 'nursing'; items: DoctorOrderItem[]; notes?: string | null; status: string; createdAt?: string };

/**
 * WP-K: the patient's orders from their doctors (GET /patient/doctor-orders).
 * Each ordered service opens its real booking screen. Before, this screen read
 * a payload nothing ever sent and was never opened.
 */
export default function ActionableOrderScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<DoctorOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setError(null);
    setOrders(null);
    apiFetch('/patient/doctor-orders')
      .then((res: any) => setOrders(Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
      .catch((e: any) => setError(e?.message || 'تعذّر تحميل طلبات الطبيب'));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const book = (order: DoctorOrder, item: DoctorOrderItem) => {
    const name = item.name_ar || item.name_en || '';
    if (order.kind === 'nursing') router.push({ pathname: '/nursing/service-details', params: { serviceId: item.service_id, title: name } } as any);
    else router.push({ pathname: '/diagnostics/test-detail', params: { id: item.service_id, ...(order.kind === 'radiology' ? { type: 'radiology' } : {}) } } as any);
  };
  const kindLabel = (k: DoctorOrder['kind']) => (k === 'lab' ? 'تحاليل' : k === 'radiology' ? 'أشعة' : 'تمريض منزلي');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <I name="arrow-right" size={24} color={theme.text} />
        </TouchableOpacity>
        <LocalizedText style={styles.headerTitle}>طلبات طبيبك</LocalizedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {orders === null && !error ? <ActivityIndicator color={theme.primary} /> : null}
        {error ? (
          <View style={styles.section}>
            <LocalizedText style={styles.itemText}>{error}</LocalizedText>
            <TouchableOpacity style={styles.actionBtn} onPress={load}><LocalizedText style={styles.actionBtnText}>إعادة المحاولة</LocalizedText></TouchableOpacity>
          </View>
        ) : null}
        {orders && orders.length === 0 ? (
          <View style={styles.section}><LocalizedText style={styles.itemSub}>لا توجد طلبات من طبيبك حالياً.</LocalizedText></View>
        ) : null}
        {(orders || []).map((order) => (
          <View key={order.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <I name="document" size={20} color={theme.primary} />
              <LocalizedText style={styles.sectionTitle}>{kindLabel(order.kind)}</LocalizedText>
            </View>
            {order.notes ? <LocalizedText style={styles.itemSub}>{order.notes}</LocalizedText> : null}
            {order.items.map((item) => (
              <View key={item.service_id} style={styles.itemRow}>
                <View style={{ flex: 1, marginRight: SP.sm }}>
                  <LocalizedText style={styles.itemText}>{item.name_ar || item.name_en || item.service_id}</LocalizedText>
                </View>
                <TouchableOpacity style={styles.actionBtn} onPress={() => book(order, item)}>
                  <LocalizedText style={styles.actionBtnText}>احجز</LocalizedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: SP.lg, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: SP.xs },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  content: { padding: SP.lg, paddingBottom: 100 },
  alertBox: { flexDirection: 'row-reverse', backgroundColor: theme.successBg, padding: SP.lg, borderRadius: R.md, marginBottom: SP.xl, alignItems: 'center', gap: SP.md },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: theme.success, textAlign: 'right' },
  alertSub: { fontSize: 14, color: theme.success, textAlign: 'right', marginTop: 4 },
  section: { backgroundColor: theme.surface, borderRadius: R.md, padding: SP.lg, marginBottom: SP.lg, borderWidth: 1, borderColor: theme.border },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: SP.sm, marginBottom: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: SP.sm },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: SP.sm, borderBottomWidth: 1, borderBottomColor: theme.border },
  itemText: { fontSize: 14, fontWeight: 'bold', color: theme.text, textAlign: 'right' },
  itemSub: { fontSize: 12, color: theme.textSub, textAlign: 'right', marginTop: 2 },
  actionBtn: { flexDirection: 'row-reverse', backgroundColor: theme.primary, padding: SP.md, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginTop: SP.lg },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
