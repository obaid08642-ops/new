// @ts-nocheck
// app/pharmacy/offers.tsx — PH-PHARMACY step 3-5: compare pharmacy offers, pick one.
import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { apiFetch } from '../../src/utils/api';
import { AppText, Card, Button, Badge } from '../../src/components/ui';

export default function PharmacyOffersScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const orderId = String(params.orderId || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setError(null);
      const res = await apiFetch(`/patient/pharmacy/orders/${orderId}/offers`);
      setData(res);
    } catch (e) {
      setError('تعذر تحميل العروض. اسحب للتحديث أو حاول لاحقاً.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const selectOffer = async (pharmacyAccountId: string) => {
    setSelecting(pharmacyAccountId);
    try {
      await apiFetch(`/patient/pharmacy/orders/${orderId}/select-offer`, {
        method: 'POST',
        body: JSON.stringify({ pharmacy_account_id: pharmacyAccountId }),
      });
      // بعد اختيار العرض: الدفع (بطاقة الآن) — السعر من العرض المختار سيرفرياً
      router.replace({
        pathname: '/pharmacy/payment',
        params: { orderId, kind: 'pharmacy-order', method: 'CARD' },
      });
    } catch (e) {
      alert('تعذر اختيار العرض، حاول مجدداً');
      setSelecting(null);
    }
  };

  const cancelOrder = async () => {
    try { await apiFetch(`/patient/pharmacy/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'patient_cancelled_at_offers' }) }); } catch {}
    router.replace('/(tabs)/pharmacy');
  };

  const offers = data?.offers || [];
  const awaiting = ['broadcasting', 'awaiting_full_acceptance', 'awaiting_offer_selection'].includes(String(data?.state));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}><AppText style={{ color: colors.p }}>رجوع</AppText></TouchableOpacity>
        <AppText style={[styles.title, { color: colors.n }]}>عروض الصيدليات</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {error && <Card><AppText style={{ color: '#B45309' }}>{error}</AppText></Card>}

        {!error && offers.length === 0 && (
          <Card>
            <AppText style={{ color: colors.t1, textAlign: 'center' }}>
              {awaiting ? 'جارٍ إرسال طلبك للصيدليات القريبة… ستظهر العروض هنا تلقائياً.' : 'لا توجد عروض لهذا الطلب.'}
            </AppText>
          </Card>
        )}

        {offers.map((o, i) => (
          <Card key={`${o.pharmacy_account_id}_${i}`} style={styles.offer}>
            <View style={styles.rowTop}>
              <AppText style={[styles.phName, { color: colors.n }]}>{o.pharmacy_name}</AppText>
              {o.response_type === 'have_all'
                ? <Badge label="متوفر كامل" tone="success" />
                : <Badge label={`متوفر ${o.available_items}/${o.total_items}`} tone="warning" />}
            </View>

            <AppText style={{ color: colors.t2, marginTop: 6 }}>
              💰 السعر التقديري: {o.subtotal_estimate ?? '—'} ر.س{o.delivery_fee ? ` + توصيل ${o.delivery_fee} ر.س` : ' (توصيل مجاني)'}
            </AppText>
            {!!o.eta_minutes && <AppText style={{ color: colors.t2 }}>⏱ التجهيز خلال ~{o.eta_minutes} دقيقة</AppText>}
            {o.items?.some(it => it.have === 'alternative') && (
              <AppText style={{ color: '#0E7490', marginTop: 4 }}>🔄 يتضمن بدائل مقترحة لبعض الأصناف</AppText>
            )}
            {o.items?.some(it => it.have === 'no') && (
              <AppText style={{ color: '#B91C1C', marginTop: 2 }}>⚠️ أصناف ناقصة في هذا العرض</AppText>
            )}

            <Button
              label="اختيار هذا العرض"
              onPress={() => selectOffer(o.pharmacy_account_id)}
              disabled={selecting !== null}
              style={{ marginTop: 12 }}
            />
          </Card>
        ))}

        {awaiting && offers.length > 0 && (
          <AppText style={{ textAlign: 'center', color: colors.t3, marginTop: 8 }}>
            قد تصل عروض جديدة — يمكنك المقارنة قبل الاختيار.
          </AppText>
        )}
      </ScrollView>

      <TouchableOpacity onPress={cancelOrder} style={styles.cancelBtn}>
        <AppText style={{ color: '#DC2626' }}>إلغاء الطلب</AppText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '700' },
  offer: { marginBottom: 14 },
  rowTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  phName: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'right' },
  cancelBtn: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', paddingVertical: 10 },
});
