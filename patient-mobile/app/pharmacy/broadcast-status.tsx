// app/pharmacy/broadcast-status.tsx — renders only live bids returned for a real order request.
import React, { useEffect, useState } from 'react';
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
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await apiFetch(`/orders/bids/request/${orderId}`);
        if (active) setBids(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
      } catch {
        if (active) setBids([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [orderId]);

  const acceptBid = async (bidId: string) => {
    if (!orderId) return;
    setAcceptingBid(bidId);
    try {
      await apiFetch(`/orders/bids/${bidId}/accept`, { method: 'POST' });
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
    } catch (error: any) {
      showLocalizedAlert('تعذر قبول العرض', error?.message || 'ربما انتهت صلاحية العرض أو تم اختياره مسبقاً.');
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
          : bids.length === 0 ? <Card><AppText variant="bodySM" color={colors.textSecondary}>لا توجد عروض متاحة حتى الآن. ستُحدّث القائمة تلقائياً.</AppText></Card>
          : bids.map((bid) => (
            <Card key={bid.id}>
              <View style={styles.row}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="h6">عرض صيدلية</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>العناصر المتاحة: {Array.isArray(bid.items) ? bid.items.filter((item: any) => item.available).length : 0}</AppText>
                </View>
                <Icon name="pharmacy" size={24} color={colors.primary} />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.row}>
                <AppText variant="bodySM" color={colors.textSecondary}>إجمالي العرض</AppText>
                <AppText variant="h6" color={colors.primary}>{Number.isFinite(Number(bid.total_price)) ? `${Number(bid.total_price).toFixed(2)} ر.س` : '—'}</AppText>
              </View>
              {bid.status === 'pending' && <Button label="قبول هذا العرض" variant="gradient" size="md" loading={acceptingBid === bid.id} disabled={acceptingBid !== null} onPress={() => acceptBid(bid.id)} style={{ marginTop: 14 }} />}
              {bid.status !== 'pending' && <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 14 }}>حالة العرض: {bid.status}</AppText>}
            </Card>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1, marginVertical: 12 },
});
