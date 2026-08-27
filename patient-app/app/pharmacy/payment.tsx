// @ts-nocheck
/**
 * app/pharmacy/payment.tsx
 * Payment screen — REAL Moyasar hosted-checkout flow (same canonical flow as consultations).
 * - Loads the order from the server; amount displayed is ALWAYS the server-side total
 *   (or the provider-set insurance copay for approved insurance orders).
 * - POST /payments/intent/pharmacy/:orderId → hosted checkout → /payments/processing
 *   which polls /payments/verify until paid/failed. No simulated outcomes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function PharmacyPaymentScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { clearCart } = useCart();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoadError(false);
      const data = await apiFetch(`/orders/${orderId}`);
      setOrder(data);
    } catch {
      setOrder(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const isInsurance = order?.payment_method === 'insurance';
  const insuranceApproved = order?.insurance_status === 'APPROVED' || order?.insurance_status === 'PARTIAL_APPROVAL';
  // Amount ALWAYS comes from the server — never from route params or client math.
  const serverTotal = isInsurance ? Number(order?.insurance_copay || 0) : Number(order?.total || 0);
  const amountToPay = Math.max(0, Math.round(serverTotal * 100) / 100);
  const alreadyPaid = order?.payment_status === 'paid';

  const isCash = order?.payment_method === 'cash';

  const handlePay = async () => {
    if (!orderId) return;
    if (isCash) {
      // Cash on delivery — nothing to charge online.
      clearCart();
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
      return;
    }
    if (alreadyPaid) {
      clearCart();
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
      return;
    }
    if (amountToPay <= 0) {
      // Fully covered by insurance or a server-recorded loyalty discount — nothing to charge.
      clearCart();
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
      return;
    }
    setProcessing(true);
    try {
      const txn = await apiFetch<any>(`/payments/intent/pharmacy/${orderId}`, { method: 'POST', headers: paymentIntentHeaders('pharmacy', orderId) });
      if (!txn || !txn.id) throw new Error('intent_failed');
      router.push({
        pathname: '/payments/processing',
        params: {
          moyasarId: txn.id,
          paymentUrl: txn.checkout_url || '',
          bookingId: orderId,
          bookingKind: 'pharmacy',
          amount: String(txn.amount ?? amountToPay),
        },
      });
    } catch (err: any) {
      showLocalizedAlert('تعذر بدء الدفع', err?.message || 'حدث خطأ أثناء إنشاء عملية الدفع. حاول مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#23B5CE" />
        <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: colors.t2, marginTop: 16 }}>جاري تحميل الطلب...</LocalizedText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: colors.n, fontSize: 18, marginBottom: 8 }}>تعذر تحميل الطلب</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: colors.t2, textAlign: 'center', marginBottom: 24 }}>
          تحقق من اتصالك بالإنترنت ثم حاول مجدداً
        </LocalizedText>
        <TouchableOpacity onPress={() => { setLoading(true); loadOrder(); }} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}>
          <LocalizedText style={{ color: '#FFF', fontFamily: 'Cairo-Bold' }}>إعادة المحاولة</LocalizedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <LocalizedText style={{ color: colors.t2, fontFamily: 'Cairo-Bold' }}>رجوع</LocalizedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 28 }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={[styles.headerTitle, { color: colors.n } ]}>إتمام الدفع</LocalizedText>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: isInsurance ? '#E2F7F2' : '#DEF5F9' } ]}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#141A2A', marginBottom: 8 }}>
            {isInsurance ? 'نسبة التحمل المطلوبة منك' : 'المبلغ المستحق الدفع'}
          </LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 42, color: '#141A2A' }}>
            {amountToPay.toFixed(2)}
            <LocalizedText style={{ fontSize: 18, color: '#4C5566' }}> ر.س</LocalizedText>
          </LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#4C5566', marginTop: 8 }}>
            طلب رقم #{String(orderId || '').slice(-6) || '------'}
          </LocalizedText>
          {Number(order?.coupon_discount || 0) > 0 && (
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#2BB89C', marginTop: 4 }}>
              خصم الكوبون: -{Number(order.coupon_discount).toFixed(2)} ر.س
            </LocalizedText>
          )}
          {Number(order?.loyalty_discount || 0) > 0 && (
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#2BB89C', marginTop: 4 }}>
              خصم النقاط: -{Number(order.loyalty_discount).toFixed(2)} ر.س
            </LocalizedText>
          )}
        </View>

        {/* Insurance pending review */}
        {isInsurance && !insuranceApproved && (
          <View style={[styles.infoCard, { backgroundColor: '#FFF6E5', borderColor: '#F5C36B' }]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#D89A2B', fontSize: 22, marginRight: 8 }}>hourglass_top</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#8A6414', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
              طلب التأمين قيد المراجعة — سيتمكن الدفع بعد اعتماد التغطية وتحديد نسبة التحمل
            </LocalizedText>
          </View>
        )}

        {/* Cash on delivery notice */}
        {isCash && (
          <View style={[styles.infoCard, { backgroundColor: '#E2F7F2', borderColor: '#7BD7C2' }]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#2BB89C', fontSize: 22, marginRight: 8 }}>payments</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#14665A', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
              طلبك بالدفع عند الاستلام — ادفع نقداً أو بالشبكة عند وصول الطلب
            </LocalizedText>
          </View>
        )}

        {/* Payment method info — actual method is chosen inside the secure Moyasar page */}
        {!isCash && (
        <>
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الدفع</LocalizedText>
        <View style={[styles.methodCard, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.methodIcon, { backgroundColor: '#DEF5F9' }]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: '#23B5CE' }}>credit_card</LocalizedText>
          </View>
          <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>بطاقة بنكية أو محفظة رقمية</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 2 }}>
              Visa وMastercard وApple Pay وGoogle Pay حسب دعم بوابة الدفع والجهاز
            </LocalizedText>
          </View>
        </View>

        {/* Security Badge */}
        <View style={[styles.securityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#2BB89C', fontSize: 18, marginRight: 6 }}>lock</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>
            معاملتك آمنة ومشفرة · تتم عبر بوابة Moyasar المرخصة
          </LocalizedText>
        </View>
        </>
        )}
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.footer, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: insets.bottom + 16 } ]}>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: (processing || (isInsurance && !insuranceApproved && amountToPay > 0)) ? colors.bd : '#23B5CE' }]}
          onPress={handlePay}
          disabled={processing || (isInsurance && !insuranceApproved && amountToPay > 0)}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>payments</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>
                {isCash || alreadyPaid || amountToPay <= 0 ? 'متابعة الطلب' : `دفع ${amountToPay.toFixed(2)} ر.س`}
              </LocalizedText>
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
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  securityRow: { alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingTop: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 20 },
});
