// @ts-nocheck
/**
 * app/pharmacy/order-tracking.tsx
 * Real-time order tracking screen.
 * - Polls GET /orders/:orderId/tracking every 30 seconds.
 * - Displays dynamic timeline steps based on backend status.
 * - Shows pharmacy info and chat button.
 * - Graceful fallback for testing.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';

type TrackingStep = {
  id: string;
  title: string;
  desc: string;
  time: string;
  done: boolean;
  active: boolean;
};

const buildSteps = (state: string, updatedAt?: string): TrackingStep[] => {
  const time = (s: string) => s ? new Date(s).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';

  const stateMap: Record<string, number> = {
    'CREATED': 0, 'VALIDATED': 0, 'PHARMACY_RECEIVED': 0,
    'ACCEPTED': 1, 'PREPARING': 1,
    'READY_FOR_DISPATCH': 2, 'ASSIGNED_TO_DELIVERY': 2, 'OUT_FOR_DELIVERY': 2,
    'DELIVERED': 3,
  };
  const currentLevel = stateMap[state] ?? 0;

  return [
    { id: 's1', title: 'تم استلام طلبك', desc: 'تم تأكيد طلبك بنجاح وإرساله للمعالجة.', time: time(updatedAt || ''), done: currentLevel >= 0, active: currentLevel === 0 },
    { id: 's2', title: 'الصيدلية تجهّز طلبك', desc: 'صيدلية النهدي تراجع وتجهّز الأدوية المطلوبة.', time: currentLevel >= 1 ? time(updatedAt || '') : '', done: currentLevel > 1, active: currentLevel === 1 },
    { id: 's3', title: 'في الطريق إليك', desc: 'المندوب استلم الطلب وهو الآن في طريقه إليك.', time: currentLevel >= 2 ? time(updatedAt || '') : '', done: currentLevel > 2, active: currentLevel === 2 },
    { id: 's4', title: 'تم التوصيل بنجاح', desc: 'وصل طلبك. نتمنى لك الشفاء العاجل ', time: currentLevel >= 3 ? time(updatedAt || '') : '', done: currentLevel >= 3, active: false },
  ];
};

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [steps, setSteps] = useState<TrackingStep[]>(buildSteps('preparing'));
  const [orderData, setOrderData] = useState<any>(null);

  const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;

  // ─── Poll tracking status ────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      if (!orderIdStr) return;
      try {
        const data = await apiFetch(`/orders/${orderIdStr}/tracking`);
        if (data) {
          setOrderData(data);
          setSteps(buildSteps(data.state, data.updated_at));
        }
      } catch {
        // Use demo state for testing
        setSteps(buildSteps('preparing'));
        setOrderData({ pharmacy_name: 'صيدلية النهدي – فرع العليا', pharmacy_distance: '٢.٣ كم', estimated_arrival: '٢٠ دقيقة', total: 117.50 });
      }
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [orderIdStr]);

  const orderNum = orderIdStr ? `#${orderIdStr.slice(-6).toUpperCase()}` : '#------';
  const pharmacyName = orderData?.pharmacy_name || 'صيدلية النهدي – فرع العليا';
  const estimatedTime = orderData?.estimated_arrival || '٢٠–٣٠ دقيقة';
  const total = orderData?.total || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.s }]}
          onPress={() => router.replace('/(tabs)/pharmacy')}
        >
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>home</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.n } ]}>تتبع الطلب {orderNum}</Text>
        <View style={{ width: 44 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Pharmacy Card */}
        <View style={[styles.pharmacyCard, { backgroundColor: '#DEF5F9', flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <View style={styles.pharIcon}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 30 }}>local_pharmacy</Text>
          </View>
          <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#141A2A' }}>{pharmacyName}</Text>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row' }, { alignItems: 'center', marginTop: 4 }]} >
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#4C5566', fontSize: 15, marginRight: 4 }}>schedule</Text>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: '#4C5566' }}>الوقت المتوقع: {estimatedTime}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => router.push('/pharmacy/chat-with-pharmacist')}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 26 }}>chat</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
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
                      ? <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 14 }}>check</Text>
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
                    <Text style={{
                      fontFamily: step.active ? 'Cairo-Black' : step.done ? 'Cairo-Bold' : 'Cairo-Regular',
                      fontSize: step.active ? 16 : 15,
                      color: (step.active || step.done) ? colors.n : colors.t3,
                    }}>
                      {step.title}
                    </Text>
                    {step.time ? (
                      <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t3 }}>{step.time}</Text>
                    ) : null}
                  </View>
                  {(step.active || step.done) && (
                    <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.t2, marginTop: 4, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }}>
                      {step.desc}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: colors.n, marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>تفاصيل الطلب</Text>
          {[
            { label: 'رقم الطلب', val: orderNum },
            { label: 'طريقة الاستلام', val: 'توصيل للمنزل' },
            { label: 'الإجمالي المدفوع', val: `${total.toFixed(2)} ر.س` },
          ].map((row, i) => (
            <View key={i} style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
              <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: colors.t2 }}>{row.label}</Text>
              <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 13, color: colors.n }}>{row.val}</Text>
            </View>
          ))}
        </View>
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
});

export function ErrorBoundary({ error, retry }: any) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontFamily: 'Cairo-Black', fontSize: 18, color: '#F0695C', marginBottom: 10 }}>حدث خطأ غير متوقع</Text>
      <Text style={{ fontFamily: 'Cairo-Regular', fontSize: 14, color: '#4C5566', textAlign: 'center', marginBottom: 20 }}>{error?.message || 'تعذر تحميل الصفحة'}</Text>
      <TouchableOpacity onPress={retry} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
        <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>إعادة المحاولة</Text>
      </TouchableOpacity>
    </View>
  );
}
