import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';

export default function DiagnosticsCheckoutScreen() {
  const { colors } = useApp();
  const { labId, serviceType } = useLocalSearchParams<{ labId?: string; serviceType?: string }>();
  const { items, clearCart, paymentType } = useDiagnosticsCart();
  const [scheduledAt, setScheduledAt] = useState(() => { const next = new Date(); next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0); return next; });
  const [submitting, setSubmitting] = useState(false);
  const kinds = useMemo(() => Array.from(new Set(items.map((item) => item.kind))), [items]);
  const kind = kinds[0];
  const isHome = serviceType === 'home';

  async function confirm() {
    if (!items.length) { Alert.alert('السلة فارغة', 'أضف خدمة تشخيصية قبل اختيار الموعد.'); return; }
    if (kinds.length !== 1) { Alert.alert('سلة غير مدعومة', 'أكمل حجز التحاليل والأشعة في طلبين منفصلين حتى لا ينشأ طلب جزئي.'); return; }
    if (isHome) { Alert.alert('الزيارة المنزلية تحتاج بيانات إضافية', 'اختر زيارة المركز حاليًا. الزيارة المنزلية لن تنشأ قبل اختيار عنوان موثق وإثبات التأمين عند الحاجة.'); return; }
    if (scheduledAt.getTime() < Date.now() + 5 * 60_000) { Alert.alert('موعد غير صالح', 'اختر موعدًا مستقبليًا.'); return; }
    setSubmitting(true);
    try {
      let bookingId = '';
      if (kind === 'lab') {
        if (!labId) throw new Error('provider_required');
        const result: any = await apiFetch('/labs/bookings', { method: 'POST', body: JSON.stringify({ items: items.map((item) => ({ service_id: item.id })), provider_account_id: labId, scheduled_at: scheduledAt.toISOString(), location_type: 'facility', payment_method: paymentType }) });
        bookingId = result?.id || '';
      } else if (kind === 'radiology') {
        if (items.length !== 1) throw new Error('radiology_single_service_required');
        const result: any = await apiFetch('/radiology/bookings', { method: 'POST', body: JSON.stringify({ service_id: items[0].id, scheduled_at: scheduledAt.toISOString(), delivery_mode: 'IN_CENTER' }) });
        bookingId = result?.id || '';
      } else { throw new Error('unsupported_diagnostic_kind'); }
      if (!bookingId) throw new Error('booking_response_invalid');
      await clearCart();
      router.replace({ pathname: '/diagnostics/order/[id]', params: { id: bookingId } });
    } catch (error: any) {
      const message = error?.message === 'provider_required' ? 'اختر مختبرًا متوافقًا من السلة قبل المتابعة.' : error?.message === 'radiology_single_service_required' ? 'احجز فحص أشعة واحدًا في كل طلب.' : 'تعذر إنشاء الحجز. لم يتم الانتقال إلى صفحة نجاح وهمية؛ راجع الموعد والمزود ثم حاول مرة أخرى.';
      Alert.alert('تعذر إتمام الحجز', message);
    } finally { setSubmitting(false); }
  }

  if (!items.length) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.center}><AppText style={{ color: colors.textPrimary }}>السلة التشخيصية فارغة</AppText><TouchableOpacity onPress={() => router.replace('/(tabs)/diagnostics')}><AppText style={{ color: colors.primary }}>العودة للتشخيص</AppText></TouchableOpacity></View></SafeAreaView>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Icon name="arrow-right" size={26} color={colors.textPrimary} /></TouchableOpacity><AppText style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>اختيار موعد الحجز</AppText><View style={{ width: 26 }} /></View><View style={styles.content}><AppText style={{ color: colors.textSecondary, textAlign: 'center' }}>{kind === 'lab' ? 'سيُرسل الطلب إلى المختبر الذي اخترته من القائمة المتوافقة.' : 'سيُرسل طلب فحص الأشعة إلى المركز للمراجعة والتأكيد.'}</AppText><AppText style={[styles.label, { color: colors.textPrimary }]}>موعد الخدمة</AppText><DateTimePicker value={scheduledAt} mode="datetime" display="default" minimumDate={new Date(Date.now() + 5 * 60_000)} onChange={(_, date) => date && setScheduledAt(date)} /><AppText style={{ color: colors.textSecondary }}>{scheduledAt.toLocaleString()}</AppText>{isHome ? <AppText style={{ color: '#D9534F', textAlign: 'center' }}>اختيار الزيارة المنزلية غير مكتمل في هذا المسار؛ استخدم زيارة المركز.</AppText> : null}<TouchableOpacity disabled={submitting} style={[styles.confirm, { backgroundColor: submitting ? colors.border : colors.primary }]} onPress={() => void confirm()}>{submitting ? <ActivityIndicator color="#fff" /> : <AppText style={{ color: '#fff', fontWeight: 'bold' }}>تأكيد الحجز</AppText>}</TouchableOpacity></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }, content: { padding: 24, gap: 20 }, label: { fontWeight: 'bold', marginTop: 12 }, confirm: { borderRadius: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 20 } });
