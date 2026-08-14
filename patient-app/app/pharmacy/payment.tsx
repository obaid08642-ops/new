// @ts-nocheck
/**
 * app/pharmacy/payment.tsx
 * Payment screen — Moyasar integration.
 * - Shows order total, payment methods.
 * - Calls POST /payments/initiate with Moyasar.
 * - On success → navigates to order-tracking.
 * - Displays copay if insurance was selected earlier.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';

export default function PharmacyPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { paymentType } = useCart();

  const [selectedMethod, setSelectedMethod] = useState<'mada' | 'visa'>('mada');
  const [processing, setProcessing] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [amountToPay, setAmountToPay] = useState<number | null>(null);
  const [paymentReady, setPaymentReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!orderId) throw new Error('missing_order_id');
        const [methods, order] = await Promise.all([
          apiFetch('/payments/paymob/methods'),
          apiFetch(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}`),
        ]);
        if (Array.isArray(methods)) setPaymentMethods(methods);
        const total = Number(order?.totals?.total);
        if (!Number.isFinite(total) || total <= 0 || order?.basket_review_status !== 'patient_approved') {
          throw new Error('order_not_ready_for_payment');
        }
        setAmountToPay(total);
        setPaymentReady(true);
      } catch {
        setPaymentReady(false);
      }
    })();
  }, [orderId]);

  const handlePay = async () => {
    if (!paymentReady || amountToPay === null || !orderId) {
      Alert.alert('الدفع غير متاح', 'انتظر اعتماد عرض الصيدلية والسعر النهائي قبل الدفع.');
      return;
    }
    setProcessing(true);
    try {
      const res = await apiFetch('/payments/paymob/initiate', {
        method: 'POST',
        body: JSON.stringify({
          order_id: orderId,
          method: selectedMethod,
        }),
      });

      if (!res?.url) throw new Error('payment_url_missing');
      await Linking.openURL(res.url);
    } catch {
      Alert.alert('تعذر بدء الدفع', 'لم يتم تأكيد أي عملية دفع. تحقق من الاتصال وحالة الطلب ثم أعد المحاولة.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.n } ]}>إتمام الدفع</Text>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: paymentType === 'insurance' ? '#E2F7F2' : '#DEF5F9' } ]}>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#141A2A', marginBottom: 8 }}>
            {paymentReady ? 'المبلغ المستحق وفق العرض المعتمد' : 'بانتظار العرض المعتمد'}
          </Text>
          <Text style={{ fontFamily: 'Cairo-Black', fontSize: 42, color: '#141A2A' }}>
            {amountToPay === null ? '—' : amountToPay.toFixed(2)}
            {amountToPay !== null && <Text style={{ fontSize: 18, color: '#4C5566' }}> ر.س</Text>}
          </Text>
          <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#4C5566', marginTop: 8 }}>
            طلب رقم #{orderId?.slice(-6) || '------'}
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>اختر طريقة الدفع</Text>
        {paymentMethods.map(method => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, {
              backgroundColor: selectedMethod === method.id ? `${method.color}15` : colors.s,
              borderColor: selectedMethod === method.id ? method.color : colors.bd,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIcon, { backgroundColor: selectedMethod === method.id ? method.color : colors.bg } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: selectedMethod === method.id ? '#fff' : colors.t2 }}>
                {method.icon}
              </Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{method.label}</Text>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 2 }}>{method.sub}</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: selectedMethod === method.id ? method.color : colors.bd } ]}>
              {selectedMethod === method.id && <View style={[styles.radioInner, { backgroundColor: method.color }]} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Security Badge */}
        <View style={[styles.securityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#2BB89C', fontSize: 18, marginRight: 6 }}>lock</Text>
          <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>
            معاملتك آمنة ومشفرة بتقنية SSL · مدعوم بـ Moyasar
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.footer, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: insets.bottom + 16 } ]}>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: processing || !paymentReady ? colors.bd : '#23B5CE' }]}
          onPress={handlePay}
          disabled={processing || !paymentReady}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>payments</Text>
              <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>الانتقال إلى بوابة الدفع</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Cairo-Black', fontSize: 18 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  amountCard: { padding: 28, borderRadius: 24, alignItems: 'center', marginBottom: 28 },
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 16, marginBottom: 12 },
  methodCard: { padding: 14, borderRadius: 18, borderWidth: 1.5, marginBottom: 10, alignItems: 'center' },
  methodIcon: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  securityRow: { alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingTop: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 20 },
});
