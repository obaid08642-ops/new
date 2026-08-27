// app/pharmacy/broadcast-status.tsx — renders only live bids returned for a real order request.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function BroadcastStatusScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const orderId = Array.isArray(requestId) ? requestId[0] : requestId;
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response: any = await apiFetch(`/patient/pharmacy/orders/${orderId}/offers`);
      setOffers(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);

  const selectOffer = async (offerId: string, coverageMode: 'cash' | 'insurance') => {
    if (!orderId) return;
    setAcceptingBid(offerId);
    try {
      await apiFetch(`/patient/pharmacy/orders/${orderId}/offers/${offerId}/select`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `mobile-offer-${Date.now()}-${Math.random().toString(36).slice(2)}` },
        body: JSON.stringify({ coverage_mode: coverageMode }),
      });
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId, selectedOfferId: offerId } });
    } catch (error: any) {
      showLocalizedAlert('تعذر اختيار العرض', error?.message || 'ربما انتهت صلاحيته أو اختاره مريض آخر.');
    } finally {
      setAcceptingBid(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">عروض الصيدليات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}>
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>تُعرض العروض المتاحة لهذا الطلب فقط. السعر والأدوية الظاهرة هنا صادرة من العرض الذي أرسله المزود؛ يتم تأكيد الحالة من صفحة تتبع الطلب.</AppText>
          </View>
        </Card>

        {!orderId ? <Card><AppText variant="bodySM" color={colors.error}>رقم الطلب غير متاح، لذلك لا يمكن تحميل العروض.</AppText></Card>
          : loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          : offers.length === 0 ? <Card><AppText variant="bodySM" color={colors.textSecondary}>لا توجد عروض متاحة حتى الآن. استخدم التحديث اليدوي لاحقاً؛ لا يعني ذلك إلغاء الطلب.</AppText><Button label="تحديث العروض" variant="secondary" size="sm" onPress={() => void load()} style={{ marginTop: 12 }} /></Card>
          : offers.map((offer) => (
            <Card key={offer.id}>
              <View style={styles.row}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="h6">{offer.pharmacy_name || offer.pharmacyName || 'عرض صيدلية'}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>العناصر المتاحة: {Array.isArray(offer.lines) ? offer.lines.filter((item: any) => item.available).length : 0}</AppText>
                </View>
                <Icon name="pharmacy" size={24} color={colors.primary} />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.row}>
                <AppText variant="bodySM" color={colors.textSecondary}>إجمالي العرض</AppText>
                <AppText variant="h6" color={colors.primary}>{Number.isFinite(Number(offer?.totals?.total)) ? `${Number(offer.totals.total).toFixed(2)} ${offer?.totals?.currency || 'ر.س'}` : '—'}</AppText>
              </View>
              {Array.isArray(offer.lines) && offer.lines.map((line: any) => <View key={line.order_item_id || line.id || line.sku} style={styles.line}><AppText variant="caption">{line.name || line.sku || '—'}</AppText><AppText variant="caption" color={line.available ? colors.success : colors.error}>{line.available ? 'متوفر' : 'غير متوفر'}</AppText></View>)}
              {offer.status === 'open' && <View style={styles.selection}><Button label="اختيار نقدي/إلكتروني" variant="gradient" size="md" loading={acceptingBid === offer.id} disabled={acceptingBid !== null} onPress={() => selectOffer(offer.id, 'cash')} /><Button label="اختيار بالتأمين" variant="secondary" size="md" loading={acceptingBid === offer.id} disabled={acceptingBid !== null || !offer.insurance_ready} onPress={() => selectOffer(offer.id, 'insurance')} /></View>}
              {offer.status !== 'open' && <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 14 }}>حالة العرض: {offer.status || '—'}</AppText>}
            </Card>
          ))}
        {orderId && !loading && offers.length > 0 && <Button label="تحديث العروض يدوياً" variant="secondary" size="md" onPress={() => void load()} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1, marginVertical: 12 },
  line: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  selection: { gap: 8, marginTop: 14 },
});
