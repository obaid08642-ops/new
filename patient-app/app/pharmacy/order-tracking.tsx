// @ts-nocheck
/**
 * app/pharmacy/order-tracking.tsx
 * Governed pharmacy order status screen.
 * - Reads the owned pharmacy order once and refreshes only by explicit patient action.
 * - Does not infer a payment, negotiation, or fulfillment state from a client timer.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { LocalizedText } from '../../src/components/LocalizedText';

type TrackingStep = {
  id: string;
  title: string;
  desc: string;
  time: string;
  done: boolean;
  active: boolean;
};

const buildSteps = (state: string, updatedAt?: string, pharmacyName?: string, deliveryMode = 'DELIVERY'): TrackingStep[] => {
  const time = (s: string) => s ? new Date(s).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : '';

  const stateMap: Record<string, number> = {
    'CREATED': 0, 'VALIDATED': 0, 'PHARMACY_RECEIVED': 0,
    'ACCEPTED': 1, 'PREPARING': 1,
    'READY_FOR_DISPATCH': 2, 'ASSIGNED_TO_DELIVERY': 2, 'OUT_FOR_DELIVERY': 2,
    'DELIVERED': 3,
  };
  const currentLevel = stateMap[state] ?? 0;

  const initial = [
    { id: 's1', title: 'تم استلام طلبك', desc: 'تم تأكيد طلبك بنجاح وإرساله للمعالجة.', time: time(updatedAt || ''), done: currentLevel >= 0, active: currentLevel === 0 },
    { id: 's2', title: 'الصيدلية تجهّز طلبك', desc: `${pharmacyName || 'الصيدلية'} تراجع وتجهّز الأدوية المطلوبة.`, time: currentLevel >= 1 ? time(updatedAt || '') : '', done: currentLevel > 1, active: currentLevel === 1 },
  ];
  if (deliveryMode === 'PICKUP') {
    const ready = ['READY', 'READY_FOR_DISPATCH', 'ASSIGNED_TO_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(state);
    return [...initial, { id: 's3', title: 'جاهز للاستلام', desc: 'أصبح الطلب جاهزاً للاستلام من الصيدلية.', time: ready ? time(updatedAt || '') : '', done: ['DELIVERED', 'COMPLETED'].includes(state), active: ready && !['DELIVERED', 'COMPLETED'].includes(state) }];
  }
  return [...initial,
    { id: 's3', title: 'في الطريق إليك', desc: 'المندوب استلم الطلب وهو الآن في طريقه إليك.', time: currentLevel >= 2 ? time(updatedAt || '') : '', done: currentLevel > 2, active: currentLevel === 2 },
    { id: 's4', title: 'تم التوصيل بنجاح', desc: 'وصل طلبك. نتمنى لك الشفاء العاجل.', time: currentLevel >= 3 ? time(updatedAt || '') : '', done: currentLevel >= 3, active: false },
  ];
};

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [steps, setSteps] = useState<TrackingStep[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);

  const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;

  const load = useCallback(async () => {
    if (!orderIdStr) { setLoading(false); return; }
    setLoading(true); setFetchError(false);
    try {
      const response: any = await apiFetch(`/patient/pharmacy/orders/${orderIdStr}`);
      const data = response?.data || response;
      if (data) {
        setOrderData(data);
        setSteps(buildSteps(data.governed_state || data.effective_status || data.status, data.updatedAt || data.updated_at, data.selected_pharmacy_name || data.pharmacy_name, data.delivery_mode));
      }
    } catch { setFetchError(true); } finally { setLoading(false); }
  }, [orderIdStr]);
  useEffect(() => { void load(); }, [load]);

  const orderNum = orderIdStr ? `#${orderIdStr.slice(-6).toUpperCase()}` : 'غير متاح';
  const pharmacyName = orderData?.selected_pharmacy_name || orderData?.pharmacy_name || 'الصيدلية قيد التعيين';
  const deliveryMode = orderData?.delivery_mode || 'DELIVERY';
  const etaMinutes = Number(orderData?.delivery?.eta_minutes);
  const total = Number(orderData?.accepted_quote_snapshot?.totals?.total ?? orderData?.totals?.total);
  const governedState = orderData?.governed_state || orderData?.effective_status || orderData?.status;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.s }]}
          onPress={() => router.replace('/(tabs)/pharmacy')}
        >
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>home</LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={[styles.headerTitle, { color: colors.n } ]}>تتبع الطلب {orderNum}</LocalizedText>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Pharmacy Card */}
        <View style={[styles.pharmacyCard, { backgroundColor: '#DEF5F9', flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <View style={styles.pharIcon}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 30 }}>local_pharmacy</LocalizedText>
          </View>
          <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#141A2A' }}>{pharmacyName}</LocalizedText>
            {deliveryMode === 'DELIVERY' && Number.isFinite(etaMinutes) && (
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, { alignItems: 'center', marginTop: 4 }]} >
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#4C5566', fontSize: 15, marginRight: 4 }}>schedule</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#4C5566' }}>الوقت المتوقع: {etaMinutes} دقيقة</LocalizedText>
            </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push({ pathname: '/pharmacy/broadcast-status', params: { requestId: orderIdStr } })}
            activeOpacity={0.8}
          >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 26 }}>chat</LocalizedText>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {steps.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', color: colors.t2, textAlign: 'center' }}>
                {fetchError ? 'تعذر تحميل حالة الطلب. استخدم التحديث اليدوي.' : loading ? 'جاري تحميل حالة الطلب…' : 'لا توجد حالة متاحة بعد.'}
              </LocalizedText>
            </View>
          )}
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const nodeBg = step.done ? '#2BB89C' : step.active ? '#23B5CE' : colors.s;
            const nodeColor = (step.done || step.active) ? '#fff' : colors.bd;
            const lineColor = step.done ? '#2BB89C' : colors.bd;

            return (
              <View key={step.id} style={[styles.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                {/* Node + Line */}
                <View style={styles.nodeCol}>
                  <View style={[styles.node, { backgroundColor: nodeBg, borderColor: nodeColor } ]}>
                    {step.done
                      ? <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 14 }}>check</LocalizedText>
                      : step.active
                        ? <View style={styles.activeDot} />
                        : null
                    }
                  </View>
                  {!isLast && <View style={[styles.line, { backgroundColor: lineColor }]} />}
                </View>

                {/* Content */}
                <View style={{ flex: 1, marginBottom: 28, paddingTop: 2, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, { justifyContent: 'space-between', width: '100%' }]} >
                    <LocalizedText style={{
                      fontFamily: step.active ? 'Cairo-Black' : step.done ? 'Cairo-Bold' : 'Cairo-Regular',
                      fontSize: step.active ? 16 : 15,
                      color: (step.active || step.done) ? colors.n : colors.t3,
                    }}>
                      {step.title}
                    </LocalizedText>
                    {step.time ? (
                      <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t3 }}>{step.time}</LocalizedText>
                    ) : null}
                  </View>
                  {(step.active || step.done) && (
                    <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 4, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>
                      {step.desc}
                    </LocalizedText>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => void load()} activeOpacity={0.8} style={[styles.refresh, { borderColor: colors.bd, backgroundColor: colors.s }]}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: colors.n, fontSize: 13 }}>تحديث حالة الطلب يدوياً</LocalizedText>
        </TouchableOpacity>
        {governedState && <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd }]}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>الحالة الحاكمة: {governedState}</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 6 }}>اختيار العرض والتفاوض والسعر النهائي والتأمين والدفع تتبع حالة الخادم؛ لا يجري التطبيق أي دفع أو انتقال تلقائي.</LocalizedText>
        </View>}

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>تفاصيل الطلب</LocalizedText>
          {[
            { label: 'رقم الطلب', val: orderNum },
            { label: 'طريقة الاستلام', val: deliveryMode === 'PICKUP' ? 'استلام من الصيدلية' : 'توصيل للمنزل' },
            { label: 'إجمالي الطلب', val: Number.isFinite(total) ? `${total.toFixed(2)} ر.س` : '—' },
          ].map((row, i) => (
            <View key={i} style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>{row.label}</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.n }}>{row.val}</LocalizedText>
            </View>
          ))}
        </View>

        {/* Rate the experience — only after delivery */}
        {orderData?.state === 'DELIVERED' && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'pharmacy', booking_id: orderIdStr, providerName: orderData?.pharmacy_name || '' } })}
            activeOpacity={0.85}
            style={{ marginTop: 16, backgroundColor: colors.s, borderWidth: 1, borderColor: '#F59E0B', borderRadius: 20, padding: 16, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}
          >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F59E0B', fontSize: 24 }}>star</LocalizedText>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 14, color: colors.n }}>قيّم تجربتك مع الصيدلية</LocalizedText>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2 }}>تقييمك يساعد المرضى الآخرين</LocalizedText>
            </View>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F59E0B', fontSize: 22 }}>{isRTL ? 'chevron_left' : 'chevron_right'}</LocalizedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Cairo-Black', fontSize: 17 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pharmacyCard: { padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 28 },
  pharIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  chatBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  timeline: { paddingLeft: 4 },
  stepRow: { alignItems: 'flex-start' },
  nodeCol: { alignItems: 'center', marginRight: 16, width: 28 },
  node: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  line: { width: 2, flex: 1, minHeight: 20, marginTop: 2 },
  summaryCard: { padding: 18, borderRadius: 20, borderWidth: 1 },
  detailRow: { justifyContent: 'space-between', paddingVertical: 7 },
  refresh: { alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 12, marginBottom: 16 },
});

export function ErrorBoundary({ error, retry }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: '#F0695C', marginBottom: 10 }}>حدث خطأ غير متوقع</LocalizedText>
      <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: '#4C5566', textAlign: 'center', marginBottom: 20 }}>{error?.message || 'تعذر تحميل الصفحة'}</LocalizedText>
      <TouchableOpacity onPress={retry} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>إعادة المحاولة</LocalizedText>
      </TouchableOpacity>
    </View>
  );
}
