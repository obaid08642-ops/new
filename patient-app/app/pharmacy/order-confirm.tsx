// @ts-nocheck
/**
 * app/pharmacy/order-confirm.tsx  [NEW SCREEN]
 * Pharmacy Confirmation Screen.
 * Shown after a pharmacy accepts the order (from waiting screen).
 * - Shows pharmacy name, available items, final price.
 * - Patient can approve → goes to payment, or reject → back to searching.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function OrderConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  // ─── Fetch order details ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/orders/${orderId}`);
        setOrder(data);
      } catch {
        // API unavailable — show error state (no demo data in production)
        setOrder(null);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      // E2: was catch{} then navigate anyway — payment for an unapproved basket. Now we stay on failure.
      await apiFetch(`/orders/${orderId}/approve-basket`, { method: 'POST' });
      router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });
    } catch (e: any) {
      showLocalizedAlert('تعذر تأكيد السلة', e?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });
      router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });
    } catch (e: any) {
      showLocalizedAlert('تعذر رفض السلة', e?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#23B5CE" />
        <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: colors.t2, marginTop: 16 }}>جاري تحميل تفاصيل الطلب...</LocalizedText>
      </View>
    );
  }

  if (!order) {
    if (loadError) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: colors.n, fontSize: 18, marginBottom: 8 }}>تعذر تحميل الطلب</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: colors.t2, textAlign: 'center', marginBottom: 24 }}>تحقق من اتصالك بالإنترنت ثم حاول مجدداً</LocalizedText>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 }}>
            <LocalizedText style={{ color: '#FFF', fontFamily: 'Cairo-Bold' }}>رجوع</LocalizedText>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }

  const allAvailable = order.missing_items?.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <View style={{ width: 44 }}/>
        <LocalizedText style={[styles.headerTitle, { color: colors.n } ]}>تأكيد الطلب</LocalizedText>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>

        {/* Pharmacy Info */}
        <View style={[styles.pharmacyCard, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <View style={styles.pharmacyIcon}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 32 }}>local_pharmacy</LocalizedText>
          </View>
          <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: colors.n }}>{order.pharmacy_name}</LocalizedText>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, { alignItems: 'center', marginTop: 4 }]} >
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t2, fontSize: 16, marginRight: 4 }}>near_me</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>{order.pharmacy_distance}</LocalizedText>
              <LocalizedText style={{ color: colors.bd, marginHorizontal: 8 }}>·</LocalizedText>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t2, fontSize: 16, marginRight: 4 }}>schedule</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>{order.estimated_time}</LocalizedText>
            </View>
          </View>
          <View style={[styles.availBadge, { backgroundColor: allAvailable ? '#E2F7F2' : '#FEF4E0' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 11, color: allAvailable ? '#2BB89C' : '#F0A526' }}>
              {allAvailable ? 'كل الأصناف متوفرة' : 'متوفر جزئياً'}
            </LocalizedText>
          </View>
        </View>

        {/* Items */}
        <LocalizedText style={[styles.sectionTitle, { color: colors.n, textAlign: isRTL ? 'right' : 'left' } ]}>الأصناف</LocalizedText>
        {order.items.map((item: any, i: number) => (
          <View key={i} style={[styles.itemRow, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <View style={[styles.availDot, { backgroundColor: item.available ? '#2BB89C' : '#F0695C' }]} />
            <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{item.name}</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>الكمية: {item.qty}</LocalizedText>
            </View>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 15, color: '#23B5CE' }}>{(item.price * item.qty).toFixed(2)} ر.س</LocalizedText>
          </View>
        ))}

        {/* Missing items warning */}
        {order.missing_items?.length > 0 && (
          <View style={[styles.warningBox, { backgroundColor: '#FEF4E0', borderColor: '#F0A52622' } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0A526', fontSize: 22, marginBottom: 8 }}>info</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: '#141A2A' }}>بعض الأصناف غير متوفرة</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: '#4C5566', marginTop: 4 }}>
              سيتم تحديد الأصناف الناقصة من صيدلية أخرى أو إزالتها من طلبك.
            </LocalizedText>
          </View>
        )}

        {/* Price Summary */}
        <View style={[styles.summaryBox, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: colors.t2 }}>المجموع</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{order.subtotal?.toFixed(2)} ر.س</LocalizedText>
          </View>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: colors.t2 }}>التوصيل</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>{order.delivery_fee} ر.س</LocalizedText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.bd }]} />
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 17, color: colors.n }}>الإجمالي النهائي</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 20, color: '#23B5CE' }}>{order.total?.toFixed(2)} ر.س</LocalizedText>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: insets.bottom + 16 } ]}>
        <TouchableOpacity
          style={[styles.approveBtn, { backgroundColor: approving ? colors.bd : '#23B5CE' }]}
          onPress={handleApprove}
          disabled={approving}
          activeOpacity={0.85}
        >
          {approving
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>payments</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Black', color: '#fff', fontSize: 16 }}>قبول والمتابعة للدفع</LocalizedText>
            </>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectBtn, { backgroundColor: colors.bg, borderColor: colors.bd }]}
          onPress={handleReject}
          activeOpacity={0.8}
        >
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.t2 }}>رفض والبحث عن صيدلية أخرى</LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Cairo-Black', fontSize: 18 },
  pharmacyCard: { padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 24 },
  pharmacyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#DEF5F9', justifyContent: 'center', alignItems: 'center' },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 16, marginBottom: 12 },
  itemRow: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  availDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  warningBox: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  summaryBox: { padding: 16, borderRadius: 20, borderWidth: 1, marginTop: 16 },
  summaryRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, marginVertical: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, marginBottom: 10 },
  rejectBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: 1 },
});
