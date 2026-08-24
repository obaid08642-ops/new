// @ts-nocheck
/**
 * app/pharmacy/checkout.tsx
 * Checkout screen: collect delivery address, delivery mode, payment method.
 * - Sends real POST /orders/create to backend with cart items + location.
 * - On success → navigates to waiting-for-pharmacy with orderId.
 * - No offline simulated order flow; every order is created by the backend.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { isServerPrescriptionId } from '../../src/utils/prescription-id';

export default function PharmacyCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { items, subtotal, prescriptionUrl, paymentType, setPaymentType, clearCart } = useCart();

  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [submitting, setSubmitting] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [userAddress, setUserAddress] = useState<any>({});
  const [loadingAddress, setLoadingAddress] = useState(true);

  // ─── Coupon / loyalty / wallet (server-verified) ───────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null); // {valid, discount, reason}
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyQuote, setLoyaltyQuote] = useState<any>(null); // {max_points_for_order, point_value_sar, balance}
  const [usePoints, setUsePoints] = useState(false);

  // "Online Exclusive" is a badge only — both home delivery and pharmacy
  // pickup remain available (business decision: never block checkout).

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiFetch('/users/me/profile');
        if (profile?.addresses?.length > 0) {
          const addr = profile.addresses.find((a: any) => a.is_default) || profile.addresses[0];
          setUserAddress(addr);
        }
        if (profile?.insurance) {
          setHasInsurance(true);
        }
      } catch (err) {
        console.warn('Failed to fetch profile address');
      } finally {
        setLoadingAddress(false);
      }
    };
    fetchProfile();
    // Wallet balance + loyalty quote are display aids only — the server
    // re-validates everything (balance, caps, coupon rules) at order creation.
    apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});
  }, []);

  const deliveryFee = deliveryMode === 'delivery' ? 15 : 0;
  const preTotal = subtotal + deliveryFee;

  useEffect(() => {
    if (paymentType === 'insurance') return;
    apiFetch('/finance-engine/loyalty/redeem-quote', {
      method: 'POST',
      body: JSON.stringify({ order_total: preTotal }),
    }).then(setLoyaltyQuote).catch(() => setLoyaltyQuote(null));
  }, [preTotal, paymentType]);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCheckingCoupon(true);
    try {
      const res = await apiFetch('/finance-engine/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, order_total: preTotal }),
      });
      setCouponResult(res);
      if (!res?.valid) setCouponResult({ valid: false, reason: res?.reason || 'كوبون غير صالح' });
    } catch (e: any) {
      setCouponResult({ valid: false, reason: e?.message || 'تعذر التحقق من الكوبون' });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handlePaymentSelect = (id: 'cash' | 'card' | 'insurance' | 'wallet' | 'wallet_split') => {
    if (id === 'insurance' && !hasInsurance) {
      showLocalizedAlert(
        'التأمين غير مضاف',
        'لم تقم بإضافة بطاقة التأمين الطبي الخاصة بك. يرجى إضافتها من الملف الشخصي ليتسنى لنا تغطية الطلب.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'إضافة تأمين', onPress: () => {
            router.push('/profile/insurance');
          }}
        ]
      );
      return;
    }
    setPaymentType(id);
  };

  const handleChangeAddress = () => {
    router.push('/shared/location-picker');
  };

  const couponDiscount = couponResult?.valid ? Number(couponResult.discount || 0) : 0;
  const loyaltyDiscount = usePoints && loyaltyQuote?.enabled ? Number(loyaltyQuote.max_discount_sar || 0) : 0;
  const loyaltyPointsToUse = usePoints && loyaltyQuote?.enabled ? Number(loyaltyQuote.max_points_for_order || 0) : 0;
  const total = Math.max(0, Math.round((preTotal - couponDiscount - loyaltyDiscount) * 100) / 100);

  const handleConfirmOrder = async () => {
    if (!items.length) {
      showLocalizedAlert('السلة فارغة', 'أضف منتجات قبل إنشاء الطلب.');
      return;
    }
    if (!Number.isFinite(Number(userAddress?.lat)) || !Number.isFinite(Number(userAddress?.lng))) {
      showLocalizedAlert('حدد موقع الاستلام', 'يلزم تحديد موقع حقيقي لاختيار الصيدلية المناسبة أو التوصيل.');
      return;
    }
    const prescriptionId = isServerPrescriptionId(prescriptionUrl) ? prescriptionUrl : undefined;
    if (items.some((item) => item.rx) && !prescriptionId) {
      showLocalizedAlert('الوصفة مطلوبة', 'ارفع الوصفة مرة أخرى حتى يتم حفظها بأمان قبل إنشاء طلب الأدوية المقيدة.');
      return;
    }
    setSubmitting(true);
    try {
      // Build payload for backend
      const payload = {
        items: items.map(i => ({
          medicine_id: i.id,
          name_ar: i.name,
          qty: i.qty,
          price: i.price,
        })),
        delivery_address: {
          label: userAddress.label || 'المنزل',
          street: userAddress.street || '',
          city: userAddress.city || '',
          lat: Number(userAddress.lat),
          lng: Number(userAddress.lng),
        },
        delivery_mode: deliveryMode === 'pickup' ? 'PICKUP' : 'DELIVERY',
        payment_method: paymentType,
        prescription_id: prescriptionId,
        // Server computes the authoritative total; these are validated server-side too.
        coupon_code: couponResult?.valid ? couponCode.trim().toUpperCase() : undefined,
        loyalty_points: loyaltyPointsToUse > 0 ? loyaltyPointsToUse : undefined,
        notes: '',
      };

      let orderId: string = '';
      try {
        const res = await apiFetch('/orders/create', { method: 'POST', body: JSON.stringify(payload) });
        orderId = res?.id || res?.order_id || '';
      } catch (err) {
        console.error('Checkout API error:', err);
        throw new Error('فشل إنشاء الطلب. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.');
      }

      // Wallet fully paid at creation → track directly; everything else waits for pharmacy acceptance
      if (paymentType === 'wallet') {
        clearCart();
        router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
        return;
      }
      // Navigate to waiting screen with orderId
      router.push({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });
    } catch (e) {
      showLocalizedAlert('خطأ', 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مجدداً');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>arrow_forward</LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={[styles.headerTitle, { color: colors.n } ]}>إتمام الطلب</LocalizedText>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* ─── Delivery Mode ───────────────────────────────────────────────────── */}
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الاستلام</LocalizedText>
        <View style={[styles.modeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          {[
            { id: 'delivery' as const, icon: 'local_shipping', label: 'توصيل للمنزل', sub: `${deliveryFee} ر.س`, disabled: false },
            { id: 'pickup' as const, icon: 'storefront', label: 'استلام من الصيدلية', sub: 'مجاناً', disabled: false },
          ].map(opt => (
            <TouchableOpacity
              key={opt.id}
              disabled={opt.disabled}
              style={[styles.modeCard, {
                backgroundColor: deliveryMode === opt.id ? '#DEF5F9' : colors.s,
                borderColor: deliveryMode === opt.id ? '#23B5CE' : colors.bd,
                marginRight: isRTL ? 0 : (opt.id === 'delivery' ? 10 : 0),
                marginLeft: isRTL ? (opt.id === 'delivery' ? 10 : 0) : 0,
                opacity: opt.disabled ? 0.4 : 1,
              }]}
              onPress={() => !opt.disabled && setDeliveryMode(opt.id)}
              activeOpacity={0.8}
            >
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 32, color: deliveryMode === opt.id ? '#23B5CE' : colors.t2, marginBottom: 8 }}>
                {opt.icon}
              </LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: deliveryMode === opt.id ? '#141A2A' : colors.t2 }}>{opt.label}</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#23B5CE', marginTop: 4 }}>{opt.sub}</LocalizedText>
              {opt.disabled && (
                <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 10, color: '#7A6BEA', marginTop: 2 }}>غير متاح — حصري أونلاين</LocalizedText>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Address Block ───────────────────────────────────────────────────── */}
        {deliveryMode === 'delivery' && (
          <View style={[styles.addressCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, styles.addressTop]} >
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 22, marginRight: 10 }}>location_on</LocalizedText>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{userAddress.label || 'عنوان التوصيل'}</LocalizedText>
                <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2, marginTop: 2 }}>
                  {loadingAddress ? 'جاري التحميل...' : `${userAddress.street || ''}، ${userAddress.city || ''}`}
                </LocalizedText>
              </View>
              <TouchableOpacity onPress={handleChangeAddress}>
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#23B5CE' }}>تغيير</LocalizedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Coupon ────────────────────────────────────────────────────────── */}
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>كوبون الخصم</LocalizedText>
        <View style={[styles.couponRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            value={couponCode}
            onChangeText={(t) => { setCouponCode(t); setCouponResult(null); }}
            placeholder="أدخل كود الكوبون"
            placeholderTextColor={colors.t2}
            autoCapitalize="characters"
            style={[styles.couponInput, { backgroundColor: colors.s, borderColor: colors.bd, color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
          />
          <TouchableOpacity
            onPress={handleApplyCoupon}
            disabled={checkingCoupon || !couponCode.trim()}
            style={[styles.couponBtn, { backgroundColor: checkingCoupon || !couponCode.trim() ? colors.bd : '#23B5CE' }]}
          >
            {checkingCoupon ? <ActivityIndicator color="#fff" size="small" /> : (
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 14 }}>تطبيق</LocalizedText>
            )}
          </TouchableOpacity>
        </View>
        {couponResult && (
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: couponResult.valid ? '#2BB89C' : '#E55', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
            {couponResult.valid ? `تم تطبيق الكوبون — خصم ${Number(couponResult.discount || 0).toFixed(2)} ر.س` : `الكوبون غير صالح: ${couponResult.reason || ''}`}
          </LocalizedText>
        )}

        {/* ─── Loyalty points ────────────────────────────────────────────────── */}
        {loyaltyQuote?.enabled && Number(loyaltyQuote.max_points_for_order || 0) > 0 && paymentType !== 'insurance' && (
          <TouchableOpacity
            style={[styles.payCard, {
              backgroundColor: usePoints ? '#E2F7F2' : colors.s,
              borderColor: usePoints ? '#2BB89C' : colors.bd,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
            onPress={() => setUsePoints(!usePoints)}
            activeOpacity={0.8}
          >
            <View style={[styles.payIcon, { backgroundColor: usePoints ? '#2BB89C' : colors.bg }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: usePoints ? '#fff' : colors.t2 }}>stars</LocalizedText>
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>استخدام نقاط الولاء</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 2 }}>
                {loyaltyQuote.max_points_for_order} نقطة = خصم {Number(loyaltyQuote.max_discount_sar || 0).toFixed(2)} ر.س (حد {loyaltyQuote.max_redeem_percent}%)
              </LocalizedText>
            </View>
            <View style={[styles.radioOuter, { borderColor: usePoints ? '#2BB89C' : colors.bd }]}>
              {usePoints && <View style={[styles.radioInner, { backgroundColor: '#2BB89C' }]} />}
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Payment Mode ────────────────────────────────────────────────────── */}
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الدفع</LocalizedText>
        {[
          { id: 'card' as const, icon: 'credit_card', label: 'بطاقة بنكية / مدى / Apple Pay', sub: 'دفع إلكتروني آمن عبر Moyasar', show: true },
          { id: 'wallet' as const, icon: 'account_balance_wallet', label: 'المحفظة', sub: `رصيدك: ${walletBalance.toFixed(2)} ر.س — دفع كامل من المحفظة`, show: walletBalance >= total && total > 0 },
          { id: 'wallet_split' as const, icon: 'account_balance_wallet', label: 'محفظة + بطاقة', sub: `${walletBalance.toFixed(2)} ر.س من المحفظة والباقي بالبطاقة`, show: walletBalance > 0 && walletBalance < total },
          { id: 'cash' as const, icon: 'payments', label: 'الدفع عند الاستلام', sub: 'نقداً أو بالشبكة عند التوصيل', show: true },
          { id: 'insurance' as const, icon: 'health_and_safety', label: 'التأمين الطبي', sub: 'التعاونية · بوبا · ميدغلف', show: true },
        ].filter(o => o.show).map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.payCard, {
              backgroundColor: paymentType === opt.id ? '#DEF5F9' : colors.s,
              borderColor: paymentType === opt.id ? '#23B5CE' : colors.bd,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
            onPress={() => handlePaymentSelect(opt.id as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.payIcon, { backgroundColor: paymentType === opt.id ? '#23B5CE' : colors.bg } ]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: paymentType === opt.id ? '#fff' : colors.t2 }}>
                {opt.icon}
              </LocalizedText>
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{opt.label}</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 2 }}>{opt.sub}</LocalizedText>
            </View>
            <View style={[styles.radioOuter, { borderColor: paymentType === opt.id ? '#23B5CE' : colors.bd } ]}>
              {paymentType === opt.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* ─── Order Summary ───────────────────────────────────────────────────── */}
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>ملخص الطلب</LocalizedText>
        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
          {items.map(item => (
            <View key={item.id} style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2, flex: 1 }} numberOfLines={1}>
                {item.name} × {item.qty}
              </LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.n }}>
                {(item.price * item.qty).toFixed(2)} ر.س
              </LocalizedText>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.bd }]} />
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>رسوم التوصيل</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: deliveryFee === 0 ? '#2BB89C' : colors.n }}>
              {deliveryFee === 0 ? 'مجاناً' : `${deliveryFee} ر.س`}
            </LocalizedText>
          </View>
          {couponDiscount > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>خصم الكوبون</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#2BB89C' }}>-{couponDiscount.toFixed(2)} ر.س</LocalizedText>
            </View>
          )}
          {loyaltyDiscount > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>خصم نقاط الولاء</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#2BB89C' }}>-{loyaltyDiscount.toFixed(2)} ر.س</LocalizedText>
            </View>
          )}
          {paymentType === 'wallet_split' && walletBalance > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>سيُخصم من المحفظة</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#2BB89C' }}>-{Math.min(walletBalance, total).toFixed(2)} ر.س</LocalizedText>
            </View>
          )}
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: colors.n }}>الإجمالي</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: '#23B5CE' }}>{total.toFixed(2)} ر.س</LocalizedText>
          </View>
        </View>

      </ScrollView>

      {/* ─── Confirm Button ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: insets.bottom + 16 } ]}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: submitting ? colors.bd : '#23B5CE' }]}
          onPress={handleConfirmOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>check_circle</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>تأكيد الطلب ({total.toFixed(2)} ر.س)</LocalizedText>
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
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 16, marginBottom: 12 },
  modeRow: { marginBottom: 20 },
  modeCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1.5 },
  addressCard: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  addressTop: { alignItems: 'center' },
  payCard: { padding: 14, borderRadius: 18, borderWidth: 1.5, marginBottom: 10, alignItems: 'center' },
  payIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#23B5CE' },
  couponRow: { gap: 10, marginBottom: 8 },
  couponInput: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Cairo-Bold', fontSize: 14 },
  couponBtn: { borderRadius: 14, paddingHorizontal: 22, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  summaryRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, marginVertical: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 20 },
});
