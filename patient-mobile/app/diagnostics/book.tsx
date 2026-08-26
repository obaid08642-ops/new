// @ts-nocheck
// app/diagnostics/book.tsx — PH-SERVICE booking for LAB | RADIOLOGY
// Cash: pay now → CONFIRMED. Insurance: submit without payment → provider
// decision mirrors onto the booking → co-pay screen → settlement confirms.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { apiFetch } from '../../src/utils/api';
import { AppText, Card, Button } from '../../src/components/ui';

const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];

export default function DiagnosticsBookingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const kind = String(params.kind || 'lab'); // lab | radiology
  const serviceId = String(params.serviceId || params.packageId || '');
  const base = kind === 'radiology' ? '/radiology' : '/labs';

  const [service, setService] = useState<any>(null);
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date(Date.now() + 864e5);
    return d.toISOString().slice(0, 10);
  });
  const [slot, setSlot] = useState<string | null>(null);
  const [homeCollection, setHomeCollection] = useState(false);
  const [coverage, setCoverage] = useState<'CASH' | 'INSURANCE'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${base}/services/${serviceId}`).catch(() => null);
        setService(res || null);
      } catch {}
    })();
  }, [base, serviceId]);

  const price = Number(service?.price ?? service?.total ?? 0);

  const submit = async () => {
    if (!slot) return alert('اختر وقت الموعد أولاً');
    setSubmitting(true);
    try {
      let addr = null;
      if (homeCollection) {
        const me = await apiFetch('/users/me/addresses').catch(() => ({ data: [] }));
        addr = Array.isArray(me) ? me[0] : me?.data?.[0] || null;
        if (!addr?.lat) {
          alert('أضف عنوانًا للسحب المنزلي من ملفك أولًا');
          setSubmitting(false);
          return;
        }
      }
      const payload: any = {
        items: [{ service_id: serviceId, qty: 1 }],
        scheduled_at: `${dateStr}T${slot}:00`,
        home_collection: homeCollection,
        collection_address: addr || undefined,
        payment_method: coverage === 'INSURANCE' ? 'insurance' : 'card',
      };
      if (params.patientMemberId) payload.member_id = String(params.patientMemberId);

      const res = await apiFetch(`${base}/bookings`, { method: 'POST', body: JSON.stringify(payload) });
      const bookingId = res?.id;

      if (coverage === 'INSURANCE') {
        // لا دفع الآن — طلب التأمين فقط، القرار يصل كإشعار ثم يدفع المريض تحمّله
        const insReq = await apiFetch('/insurance/requests', {
          method: 'POST',
          body: JSON.stringify({ booking_id: bookingId, booking_kind: kind }),
        }).catch(() => null);
        clearAndRoute(bookingId, insReq?.id);
        return;
      }

      // Cash → ادفع الآن لتأكيد الحجز
      const intent = await apiFetch(`/payments/intent/${kind}/${bookingId}`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `bk-${bookingId}-${Date.now()}` },
      }).catch(() => null);
      if (intent?.checkout_url || intent?.id) {
        router.push({
          pathname: '/payments/processing',
          params: { moyasarId: intent.id, paymentUrl: intent.checkout_url || '', bookingId, bookingKind: kind, amount: String(intent.amount ?? price) },
        });
      } else {
        router.replace({ pathname: '/diagnostics/order/[id]', params: { id: bookingId, kind } });
      }
    } catch (e: any) {
      alert(e?.message || 'تعذر إنشاء الحجز');
    } finally {
      setSubmitting(false);
    }
  };

  const clearAndRoute = (bookingId: string, requestId?: string) => {
    router.replace({
      pathname: '/insurance/payment-split',
      params: requestId ? { request_id: requestId } : { orderId: bookingId },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}><AppText style={{ color: colors.p }}>رجوع</AppText></TouchableOpacity>
        <AppText style={[styles.title, { color: colors.n }]}>{kind === 'radiology' ? 'حجز أشعة' : 'حجز تحليل'}</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Card>
          <AppText style={{ color: colors.n, fontWeight: '700' }}>{service?.name_ar || service?.name || `خدمة #${serviceId}`}</AppText>
          {!!price && <AppText style={{ color: colors.t2, marginTop: 4 }}>السعر: {price} ر.س</AppText>}
        </Card>

        <Card style={{ marginTop: 12 }}>
          <AppText style={{ fontWeight: '700', color: colors.n }}>التاريخ</AppText>
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
            {[0, 1, 2].map((d) => {
              const dt = new Date(Date.now() + (d + 1) * 864e5).toISOString().slice(0, 10);
              const active = dt === dateStr;
              return (
                <TouchableOpacity key={dt} onPress={() => setDateStr(dt)}
                  style={[styles.dayBtn, { borderColor: active ? colors.p : colors.bd, backgroundColor: active ? colors.p + '22' : 'transparent' }]}>
                  <AppText style={{ color: colors.n }}>{d === 0 ? 'غداً' : new Date(dt).toLocaleDateString('ar-SA', { weekday: 'short' })}</AppText>
                  <AppText style={{ color: colors.t2, fontSize: 12 }}>{dt.slice(5)}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText style={{ fontWeight: '700', color: colors.n, marginTop: 14 }}>الوقت</AppText>
          <View style={styles.slotGrid}>
            {SLOTS.map((s) => (
              <TouchableOpacity key={s} onPress={() => setSlot(s)}
                style={[styles.slot, { borderColor: slot === s ? colors.p : colors.bd, backgroundColor: slot === s ? colors.p : 'transparent' }]}>
                <AppText style={{ color: slot === s ? '#fff' : colors.t1 }}>{s}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={[styles.rowBetween]}>
            <AppText style={{ color: colors.n }}>سحب منزلي / زيارة منزلية</AppText>
            <Switch value={homeCollection} onValueChange={setHomeCollection} trackColor={{ true: colors.p }} />
          </View>
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <AppText style={{ color: colors.n }}>التأمين الطبي</AppText>
            <Switch
              value={coverage === 'INSURANCE'}
              onValueChange={(v) => setCoverage(v ? 'INSURANCE' : 'CASH')}
              trackColor={{ true: colors.p }}
            />
          </View>
          {coverage === 'INSURANCE' && (
            <AppText style={{ color: colors.t3, fontSize: 12, marginTop: 6 }}>
              سيُرسل الطلب بدون دفع. بعد موافقة الجهة يظهر عليك التحمّل (co-pay) لتدفعه وتأكيد الحجز.
            </AppText>
          )}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          label={submitting ? 'جارٍ الإرسال...' : coverage === 'CASH' ? `ادفع واحجز — ${price} ر.س` : 'إرسال طلب التأمين'}
          onPress={submit}
          disabled={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  dayBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  slotGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slot: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' },
});
