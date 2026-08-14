// @ts-nocheck
/**
 * app/pharmacy/checkout.tsx
 * Checkout screen: collect delivery address, delivery mode, payment method.
 * - Creates then submits a real pharmacy request to the backend broadcast workflow.
 * - On success → navigates to waiting-for-pharmacy with orderId.
 * - Never creates an order locally when the backend is unavailable.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';

// Removed FALLBACK_ADDRESS
export default function PharmacyCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { items, subtotal, prescriptionUrl, paymentType, setPaymentType } = useCart();

  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [submitting, setSubmitting] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [userAddress, setUserAddress] = useState<any>({});
  const [loadingAddress, setLoadingAddress] = useState(true);

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
  }, []);

  const handlePaymentSelect = (id: 'cash' | 'insurance') => {
    if (id === 'insurance' && !hasInsurance) {
      Alert.alert(
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

  const hasDeliveryAddress = Boolean(
    userAddress?.street &&
    userAddress?.city &&
    Number.isFinite(Number(userAddress?.lat)) &&
    Number.isFinite(Number(userAddress?.lng)),
  );

  const handleConfirmOrder = async () => {
    if (!items.length) {
      Alert.alert('السلة فارغة', 'أضف الأصناف المطلوبة قبل إرسال الطلب.');
      return;
    }
    if (deliveryMode === 'delivery' && !hasDeliveryAddress) {
      Alert.alert('عنوان التوصيل مطلوب', 'اختر عنواناً محفوظاً يتضمن الموقع قبل إرسال الطلب.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map(i => ({
          raw_name: i.name,
          name_ar: i.name,
          qty: i.qty,
        })),
        delivery_address: deliveryMode === 'delivery' ? {
          label: userAddress.label,
          street: userAddress.street,
          city: userAddress.city,
          lat: Number(userAddress.lat),
          lng: Number(userAddress.lng),
        } : undefined,
        patient_notes: '',
        prescription_attachments: prescriptionUrl ? [prescriptionUrl] : [],
      };

      const created = await apiFetch('/patient/pharmacy/orders', { method: 'POST', body: JSON.stringify(payload) });
      const orderId = created?.id || created?.order_id;
      if (!orderId) throw new Error('لم تُعد الخدمة معرف طلب صالحاً.');
      await apiFetch(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/submit`, { method: 'POST' });

      router.push({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });
    } catch (e) {
      Alert.alert('خطأ', 'حدث خطأ أثناء تأكيد الطلب، يرجى المحاولة مجدداً');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>arrow_forward</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.n } ]}>إتمام الطلب</Text>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* ─── Delivery Mode ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الاستلام</Text>
        <View style={[styles.modeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          {[
            { id: 'delivery' as const, icon: 'local_shipping', label: 'توصيل للمنزل', sub: 'تحدد الرسوم في العرض' },
            { id: 'pickup' as const, icon: 'storefront', label: 'استلام من الصيدلية', sub: 'مجاناً' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.modeCard, {
                backgroundColor: deliveryMode === opt.id ? '#DEF5F9' : colors.s,
                borderColor: deliveryMode === opt.id ? '#23B5CE' : colors.bd,
                marginRight: isRTL ? 0 : (opt.id === 'delivery' ? 10 : 0),
                marginLeft: isRTL ? (opt.id === 'delivery' ? 10 : 0) : 0,
              }]}
              onPress={() => setDeliveryMode(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 32, color: deliveryMode === opt.id ? '#23B5CE' : colors.t2, marginBottom: 8 }}>
                {opt.icon}
              </Text>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: deliveryMode === opt.id ? '#141A2A' : colors.t2 }}>{opt.label}</Text>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#23B5CE', marginTop: 4 }}>{opt.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Address Block ───────────────────────────────────────────────────── */}
        {deliveryMode === 'delivery' && (
          <View style={[styles.addressCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, styles.addressTop]} >
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 22, marginRight: 10 }}>location_on</Text>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{userAddress.label || 'عنوان التوصيل'}</Text>
                <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2, marginTop: 2 }}>
                  {loadingAddress ? 'جاري التحميل...' : `${userAddress.street || ''}، ${userAddress.city || ''}`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleChangeAddress}>
                <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: '#23B5CE' }}>تغيير</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Payment Mode ────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>طريقة الدفع</Text>
        {[
          { id: 'cash' as const, icon: 'credit_card', label: 'بطاقة ائتمانية / مدى', sub: 'Visa · Mastercard · Mada' },
          { id: 'insurance' as const, icon: 'health_and_safety', label: 'التأمين الطبي', sub: 'التعاونية · بوبا · ميدغلف' },
        ].map(opt => (
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
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: paymentType === opt.id ? '#fff' : colors.t2 }}>
                {opt.icon}
              </Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n }}>{opt.label}</Text>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 2 }}>{opt.sub}</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: paymentType === opt.id ? '#23B5CE' : colors.bd } ]}>
              {paymentType === opt.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* ─── Order Summary ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>ملخص الطلب</Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
          {items.map(item => (
            <View key={item.id} style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2, flex: 1 }} numberOfLines={1}>
                {item.name} × {item.qty}
              </Text>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.n }}>
                {(item.price * item.qty).toFixed(2)} ر.س
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.bd }]} />
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>رسوم التوصيل</Text>
            <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.t2 }}>
              تحدد بعد عروض الصيدليات
            </Text>
          </View>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <Text style={{ fontFamily: 'Cairo-Black', fontSize: 16, color: colors.n }}>الإجمالي النهائي</Text>
            <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.t2 }}>يظهر بعد اختيار العرض</Text>
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
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>check_circle</Text>
              <Text style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>إرسال الطلب للصيدليات</Text>
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
  summaryCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  summaryRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, marginVertical: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 20 },
});
