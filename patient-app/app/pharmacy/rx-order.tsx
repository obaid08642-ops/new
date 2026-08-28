// app/pharmacy/rx-order.tsx — prescription items are transferred to the live pharmacy cart before checkout.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { useCart } from '../../src/context/CartContext';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function RxOrderScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { items, addItem, setPrescriptionUrl, setPaymentType } = useCart();
  const [meds, setMeds] = useState<any[]>([]);
  const [rxDetails, setRxDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/cart/prescription')
      .then((data: any) => {
        setRxDetails(data || null);
        setMeds(Array.isArray(data?.medications) ? data.medications : []);
      })
      .catch(() => setMeds([]))
      .finally(() => setLoading(false));
  }, []);

  const continueToCheckout = async () => {
    const validMeds = meds.filter((med: any) => typeof med?.id === 'string' && med.id && typeof med?.name === 'string' && med.name);
    if (!validMeds.length) {
      showLocalizedAlert('لا توجد وصفة قابلة للطلب', 'تحقق من أن الطبيب أرسل الأدوية إلى سلة الوصفة، ثم حاول مجدداً.');
      return;
    }
    setSubmitting(true);
    try {
      for (const med of validMeds) {
        if (!items.some((item) => item.id === med.id)) {
          await addItem({
            id: med.id,
            name: med.name,
            price: Number(med.price || 0),
            qty: Math.max(1, Number(med.qty || 1)),
            rx: Boolean(med.requiresRx),
            icon: 'medication',
            iconColor: colors.primary,
            iconBg: colors.primarySurface,
          });
        }
      }
      const prescriptionReference = rxDetails?.prescription_id || rxDetails?.id || rxDetails?.prescription_url || null;
      setPrescriptionUrl(prescriptionReference ? String(prescriptionReference) : null);
      setPaymentType('insurance');
      router.replace('/pharmacy/checkout');
    } catch {
      showLocalizedAlert('تعذر تجهيز السلة', 'تعذر إضافة أدوية الوصفة إلى السلة. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">طلب أدوية الوصفة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>تتم مراجعة الصيدلية والتوفر والعنوان والسعر النهائي وسداد التأمين من الخادم في خطوة إتمام الطلب. لا ينشأ طلب أو دفع من هذه الشاشة.</AppText>
          </View>
        </Card>

        {rxDetails && <Card style={{ backgroundColor: colors.successSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <Icon name="check_circle" size={22} color={colors.success} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="h6" color={colors.success}>تم العثور على وصفة مرسلة</AppText>
              {!!rxDetails?.date && <AppText variant="caption" color={colors.textTertiary}>{rxDetails.date}</AppText>}
            </View>
          </View>
        </Card>}

        <Card>
          <SectionHeader title="الأدوية الموصوفة" />
          {loading ? <ActivityIndicator color={colors.primary} /> : meds.length ? meds.map((med, index) => (
            <View key={med.id || `${med.name}-${index}`} style={[st.medRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flex: 1 }}>
                  <View style={[st.medIcon, { backgroundColor: med.requiresRx ? '#F0695C18' : colors.primarySurface }]}>
                    <Icon name="medication" size={18} color={med.requiresRx ? '#F0695C' : colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                      <AppText variant="labelMD">{med.name}</AppText>
                      {med.requiresRx && <Badge label="يتطلب وصفة" color="#F0695C" />}
                    </View>
                    <AppText variant="caption" color={colors.textTertiary}>{med.dose || 'الجرعة حسب الوصفة'}{med.qty ? ` — الكمية ${med.qty}` : ''}</AppText>
                  </View>
                </View>
              </View>
            </View>
          )) : <AppText variant="bodySM" color={colors.textSecondary}>لا توجد أدوية مرسلة في سلة الوصفة حالياً.</AppText>}
        </Card>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <Button label="مراجعة السلة وإتمام الطلب" variant="gradient" size="lg" icon="cart" loading={submitting} disabled={loading || !meds.length} onPress={continueToCheckout} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  medRow: { paddingVertical: 12 },
  medIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
