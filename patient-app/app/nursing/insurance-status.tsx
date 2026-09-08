// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { lightColors, darkColors } from '../../src/theme/colors';

const STATE_AR: Record<string, string> = {
  NEW_REQUEST: 'طلب جديد',
  PENDING_INSURANCE: 'بانتظار قرار التأمين',
  WAITING_COPAY: 'بانتظار قبول التحمل',
  APPROVED_FULL: 'مغطى بالكامل',
  APPROVED_PARTIAL: 'مغطى جزئياً',
  REJECTED: 'مرفوض من التأمين',
  CONFIRMED: 'مؤكد',
  IN_PROGRESS: 'الزيارة جارية',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغي',
};

export default function NursingInsuranceStatusScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const id = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let found: any = null;
      if (id) {
        found = await apiFetch(`/home-care/bookings/${encodeURIComponent(id)}`).catch(() => null);
        found = found?.data || found;
      }
      if (!found?.id) {
        const list: any = await apiFetch('/home-care/bookings/my?limit=5').catch(() => null);
        const arr = list?.data || list;
        found = Array.isArray(arr) ? arr.find((b: any) => b?.payment_method === 'insurance') || arr[0] : null;
      }
      setBooking(found?.id ? found : null);
      if (!found?.id) setError('لا توجد حجوزات تأمين لعرضها');
    } catch (reason: any) {
      setError(reason?.message || 'تعذر تحميل حالة التأمين');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const state = String(booking?.state || booking?.status || '');
  const copay = Number(booking?.copay_amount ?? booking?.patient_share ?? NaN);
  const decision = booking?.insurance_decision || booking?.coverage_decision || null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.s }]}>
          <AppText style={{ fontSize: 22 }}>→</AppText>
        </TouchableOpacity>
        <AppText variant="h4">حالة موافقة التأمين</AppText>
        <TouchableOpacity onPress={() => void load()} style={[styles.back, { backgroundColor: colors.s }]}>
          <AppText style={{ fontSize: 16 }}>تحديث</AppText>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 32 }}>
        {loading ? <ActivityIndicator color={colors.p} /> : error && !booking ? (
          <>
            <AppText style={{ color: colors.cr, textAlign: 'center' }}>{error}</AppText>
            <TouchableOpacity onPress={() => void load()} style={[styles.primary, { backgroundColor: colors.p }]}>
              <AppText style={styles.primaryText}>إعادة المحاولة</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.s, borderColor: colors.bd }]}>
              <AppText variant="h6" align="center">{STATE_AR[state] || state || 'غير معروف'}</AppText>
              {decision ? (
                <AppText variant="bodySM" color={colors.t2} align="center">
                  القرار: {STATE_AR[String(decision.outcome || decision.decision)] || String(decision.outcome || decision.decision || '')}
                </AppText>
              ) : null}
              {Number.isFinite(copay) && copay > 0 ? (
                <AppText variant="h6" align="center">التحمل: {copay.toFixed(2)} ر.س</AppText>
              ) : null}
              <AppText variant="bodySM" color={colors.t2} align="center">
                عند صدور القرار ستصلك إشعارات، ويمكنك متابعة الزيارة من التتبع الحي بعد التأكيد.
              </AppText>
            </View>
            {['CONFIRMED', 'IN_PROGRESS', 'APPROVED_FULL'].includes(state) && booking?.id ? (
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/nursing/live-tracking', params: { bookingId: String(booking.id) } })}
                style={[styles.primary, { backgroundColor: colors.p }]}
              >
                <AppText style={styles.primaryText}>فتح التتبع الحي</AppText>
              </TouchableOpacity>
            ) : null}
            {error ? <AppText style={{ color: colors.cr, textAlign: 'center' }}>{error}</AppText> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  back: { minWidth: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  card: { gap: 10, padding: 20, borderRadius: 20, borderWidth: 1 },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontFamily: 'Cairo-Bold' },
});
