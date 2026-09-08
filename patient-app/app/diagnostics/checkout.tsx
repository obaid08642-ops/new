// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { lightColors, darkColors } from '../../src/theme/colors';

const TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

export default function DiagnosticsCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const params = useLocalSearchParams<{ serviceType?: string; labId?: string; labName?: string }>();
  const location = params.serviceType === 'clinic' ? 'clinic' : 'home';
  const { items, clearCart } = useDiagnosticsCart();
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [method, setMethod] = useState<'card' | 'cash' | 'insurance'>(location === 'home' ? 'card' : 'cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const days = useMemo(() => {
    const out: { label: string; iso: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push({
        label: new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'numeric' }).format(d),
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      });
    }
    return out;
  }, []);

  const allowedMethods = location === 'home' ? ['card', 'insurance'] : ['cash', 'card', 'insurance'];

  async function submit() {
    if (!items.length) return;
    if (!params.labId) {
      setError('اختر المختبر من السلة أولاً');
      return;
    }
    if (!time) {
      setError('اختر اليوم والوقت');
      return;
    }
    if (method === 'insurance') {
      router.push({ pathname: '/diagnostics/insurance-upload', params: { labId: String(params.labId) } });
      return;
    }
    const [h, m] = time.split(':').map(Number);
    const scheduled = new Date(`${days[dayOffset].iso}T00:00:00`);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled.getTime() < Date.now()) {
      setError('الموعد المختار في الماضي — اختر وقتاً لاحقاً');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const labItems = items.filter((it: any) => it.kind !== 'radiology');
      const radioItems = items.filter((it: any) => it.kind === 'radiology');
      let bookingId: string | null = null;
      if (labItems.length) {
        const created: any = await apiFetch('/labs/bookings', {
          method: 'POST',
          body: JSON.stringify({
            items: labItems.map((it: any) => ({ service_id: it.id })),
            scheduled_at: scheduled.toISOString(),
            location_type: location === 'home' ? 'home' : 'facility',
            payment_method: method,
            provider_account_id: String(params.labId),
          }),
        });
        bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      for (const it of radioItems) {
        const created: any = await apiFetch('/radiology/bookings', {
          method: 'POST',
          body: JSON.stringify({
            service_id: it.id,
            scheduled_at: scheduled.toISOString(),
            location_type: location === 'home' ? 'home' : 'facility',
            payment_method: method,
            provider_account_id: String(params.labId),
          }),
        });
        if (!bookingId) bookingId = created?.id || created?.booking_id || created?.data?.id || null;
      }
      await clearCart();
      if (bookingId) {
        router.replace({ pathname: '/diagnostics/order/[id]', params: { id: String(bookingId) } });
      } else {
        router.replace('/diagnostics/orders');
      }
    } catch (reason: any) {
      setError(reason?.message || 'تعذر إنشاء الحجز');
      showLocalizedAlert('تعذر إنشاء الحجز', reason?.message || 'تحقق من الموعد وطريقة الدفع وحاول مجدداً');
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg, paddingTop: insets.top + 24 }]}>
        <AppText variant="h4">السلة فارغة</AppText>
        <TouchableOpacity onPress={() => router.replace('/diagnostics/packages')} style={[styles.primary, { backgroundColor: colors.p }]}>
          <AppText style={styles.primaryText}>تصفح الباقات والتحاليل</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.s }]}>
          <AppText style={{ fontSize: 22 }}>→</AppText>
        </TouchableOpacity>
        <AppText variant="h4">تأكيد حجز التحاليل</AppText>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 32 }}>
        <AppText variant="bodySM" color={colors.t2} align="center">
          {params.labName || 'المختبر المختار'} · {location === 'home' ? 'سحب منزلي' : 'زيارة المختبر'} · {items.length} تحاليل
        </AppText>
        <AppText variant="h6">اختر اليوم</AppText>
        <View style={styles.row}>
          {days.map((d, i) => (
            <TouchableOpacity key={d.iso} onPress={() => setDayOffset(i)} style={[styles.chip, { borderColor: colors.bd, backgroundColor: dayOffset === i ? colors.p : colors.s }]}>
              <AppText style={{ color: dayOffset === i ? '#fff' : colors.n, fontSize: 11 }}>{d.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>
        <AppText variant="h6">اختر الوقت</AppText>
        <View style={styles.row}>
          {TIMES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTime(t)} style={[styles.chip, { borderColor: colors.bd, backgroundColor: time === t ? colors.p : colors.s }]}>
              <AppText style={{ color: time === t ? '#fff' : colors.n }}>{t}</AppText>
            </TouchableOpacity>
          ))}
        </View>
        <AppText variant="h6">طريقة الدفع</AppText>
        <View style={styles.row}>
          {allowedMethods.map((pm) => (
            <TouchableOpacity key={pm} onPress={() => setMethod(pm as any)} style={[styles.chip, { borderColor: colors.bd, backgroundColor: method === pm ? colors.p : colors.s }]}>
              <AppText style={{ color: method === pm ? '#fff' : colors.n }}>
                {pm === 'cash' ? 'نقدي' : pm === 'card' ? 'بطاقة' : 'تأمين'}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
        {method === 'insurance' && (
          <AppText variant="bodySM" color={colors.t2} align="center">
            الدفع بالتأمين للسحب المنزلي يتطلب طلب طبيب أو موافقة مسبقة — ستنتقل لشاشة رفع التأمين.
          </AppText>
        )}
        {error ? <AppText style={{ color: colors.cr, textAlign: 'center' }}>{error}</AppText> : null}
        <TouchableOpacity disabled={submitting} onPress={() => void submit()} style={[styles.primary, { backgroundColor: submitting ? colors.bd : colors.p }]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <AppText style={styles.primaryText}>{method === 'insurance' ? 'متابعة لرفع التأمين' : 'تأكيد الحجز'}</AppText>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontFamily: 'Cairo-Bold' },
});
