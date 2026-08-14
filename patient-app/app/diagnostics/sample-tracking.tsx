// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function SampleTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(30);

  const fetchTracking = async () => {
    try {
      setLoading(true);
      let targetId = bookingId;
      if (!targetId) {
        // Fetch mine bookings and pick the most recent one
        const mine = await apiFetch<any[]>('/labs/bookings/mine');
        if (mine && mine.length > 0) {
          const sorted = mine.sort(
            (a, b) => new Date(b.createdAt || b.scheduled_at).getTime() - new Date(a.createdAt || a.scheduled_at).getTime()
          );
          targetId = sorted[0].id;
        }
      }

      if (!targetId) {
        setBooking(null);
        setLoading(false);
        return;
      }

      const data = await apiFetch<any>(`/labs/bookings/${targetId}`);
      setBooking(data);

      // Estimate ETA based on booking state
      if (data.state === 'CONFIRMED') {
        setEta(20);
      } else if (data.state === 'CREATED') {
        setEta(45);
      } else {
        setEta(0);
      }
    } catch (err) {
      console.log('Error loading sample tracking info', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [bookingId]);

  useEffect(() => {
    if (eta <= 0) return;
    const t = setInterval(() => setEta(e => Math.max(0, e - 1)), 60000);
    return () => clearInterval(t);
  }, [eta]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background, padding: 20 }}>
        <Icon name="navigate" size={48} color={colors.textTertiary} />
        <AppText variant="h5" color={colors.textSecondary}>لا توجد طلبات سحب عينات حالية</AppText>
        <Button label="تصفح التحاليل" onPress={() => router.push('/(tabs)/diagnostics')} />
      </View>
    );
  }

  const isCreated = booking.state === 'CREATED';
  const isConfirmed = booking.state === 'CONFIRMED';
  const isCollected = booking.state === 'SAMPLE_COLLECTED';
  const isLab = booking.state === 'IN_LAB' || booking.state === 'PROCESSING';
  const isReady = booking.state === 'RESULT_READY' || booking.state === 'REPORTED';
  const isCancelled = booking.state === 'CANCELLED';

  const steps = [
    {
      id: 1,
      title: 'تم تأكيد الحجز',
      sub: isCreated ? 'قيد المراجعة والقبول من المختبر' : 'تم استلام طلبك وتأكيد الموعد',
      icon: 'check_circle',
      done: !isCreated && !isCancelled,
      current: isCreated
    },
    {
      id: 2,
      title: 'الموظف في الطريق',
      sub: isConfirmed ? 'يتحرك نحو عنوانك الآن' : (!isCreated && !isCancelled && !isConfirmed ? 'تم وصول الموظف وسحب العينات' : 'يتحرك الموظف بعد تأكيد الحجز'),
      icon: 'navigate',
      done: !isCreated && !isConfirmed && !isCancelled,
      current: isConfirmed
    },
    {
      id: 3,
      title: 'السحب المنزلي',
      sub: isCollected ? 'جاري سحب العينة وتجهيزها للنقل' : (isLab || isReady ? 'تم سحب العينة بنجاح' : 'سيتم سحب العينات فور وصول الموظف'),
      icon: 'medication',
      done: isLab || isReady,
      current: isCollected
    },
    {
      id: 4,
      title: 'العينة في المختبر',
      sub: isLab ? 'جاري تحليل العينات في المختبر' : (isReady ? 'اكتمل التحليل المخبري' : 'بانتظار وصول العينات إلى المختبر'),
      icon: 'microscope',
      done: isReady,
      current: isLab
    },
    {
      id: 5,
      title: 'النتائج جاهزة',
      sub: isReady ? 'النتائج متوفرة الآن في السجل' : 'ستصلك رسالة فور صدورها',
      icon: 'trending_up',
      done: isReady,
      current: isReady
    }
  ];

  const tests = booking.items?.map((i: any) => i.name_ar || i.name_en) || ['تحاليل مخبرية'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 12 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/diagnostics')} style={styles.backBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM" style={{ color: '#fff', fontWeight: 'bold' }}>تتبع السحب المنزلي</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={styles.etaCard}>
          {isCancelled ? (
            <AppText variant="h5" style={{ color: '#fff', fontWeight: 'bold' }}>تم إلغاء هذا الطلب</AppText>
          ) : isReady ? (
            <AppText variant="h5" style={{ color: '#fff', fontWeight: 'bold' }}>النتائج جاهزة الآن!</AppText>
          ) : eta > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <AppText variant="h1" style={{ color: '#fff', fontWeight: 'bold', fontSize: 40 }}>{eta}</AppText>
              <AppText variant="bodySM" style={{ color: 'rgba(255,255,255,0.85)' }}>دقيقة متوقعة لوصول الموظف</AppText>
            </View>
          ) : (
            <AppText variant="h5" style={{ color: '#fff', fontWeight: 'bold' }}>جاري التحليل والمتابعة</AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        {/* Collector Info */}
        {!isCancelled && (
          <View style={[styles.collectorCard, { backgroundColor: colors.surface } ]}>
            <View style={styles.collectorActions}>
              <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#E6FAF7' }]} onPress={() => Linking.openURL(`tel:${booking.technician_phone || '0500000000'}`).catch(() => Alert.alert('خطأ', 'لا يمكن فتح تطبيق الاتصال'))}>
                <Icon name="call" size={18} color="#00977D" />
              </TouchableOpacity>
            </View>
            <View style={styles.collectorInfo}>
              <AppText variant="h6">{booking.technician_name || 'أحمد محمد — فني مختبر'}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>شهادة معتمدة • 200+ زيارة منزلية ناجحة</AppText>
            </View>
            <View style={[styles.collectorAva, { backgroundColor: '#EEF2FF' } ]}>
              <Icon name="doctor" size={20} color={colors.primary} />
            </View>
          </View>
        )}

        {/* Steps */}
        <View style={[styles.stepsCard, { backgroundColor: colors.surface } ]}>
          <AppText variant="h5" style={{ marginBottom: 16 }}>مراحل الطلب والتحليل</AppText>
          {steps.map((step, idx) => (
            <View key={step.id} style={styles.stepRow}>
              {idx < steps.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: step.done ? '#7A6BEA' : colors.borderLight }]} />
              )}
              <View style={[styles.stepIcon, {
                backgroundColor: step.done ? (step.current ? '#7A6BEA' : '#EEF2FF') : (isDark ? colors.background : colors.backgroundSecondary),
                borderWidth: step.current ? 2 : 0, borderColor: '#7A6BEA',
              } ]}>
                <Icon name={step.icon as any} size={18} color={step.done ? (step.current ? '#fff' : '#7A6BEA') : colors.textTertiary} />
              </View>
              <View style={styles.stepInfo}>
                <AppText variant="h6" color={step.done || step.current ? colors.textPrimary : colors.textTertiary}>
                  {step.title}
                </AppText>
                <AppText variant="caption" color={step.done || step.current ? colors.textSecondary : colors.textTertiary}>{step.sub}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Required Tests */}
        <Card style={{ backgroundColor: colors.surface }}>
          <AppText variant="h6" style={{ marginBottom: 8 }}>التحاليل المطلوبة</AppText>
          {tests.map((t: string, i: number) => (
            <View key={i} style={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 6, alignItems: 'center' }}>
              <Icon name="science" size={14} color="#7A6BEA" />
              <AppText variant="bodySM" color={colors.textSecondary}>{t}</AppText>
            </View>
          ))}
        </Card>

        {/* Instructions */}
        <View style={[styles.instructionsCard, { backgroundColor: colors.surface } ]}>
          <AppText variant="h6" style={{ marginBottom: 10 }}>تعليمات مهمة ️</AppText>
          {[
            'تأكد من الصيام 10 ساعات قبل السحب إذا تطلب الفحص ذلك',
            'اشرب كمية كافية من الماء لتسهيل سحب الدم',
            'أخبر الموظف فوراً عن أي أدوية مزمنة تأخذها',
            'يمكنك طلب سحب العينة من فني من نفس جنسك عند الرغبة',
          ].map((ins, i) => (
            <View key={i} style={[styles.instRow, { borderBottomColor: colors.borderLight } ]}>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, paddingRight: 6 }}>{ins}</AppText>
              <Icon name="check" size={18} color={colors.success} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  etaCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6 },
  content: { padding: 16, gap: 12 },
  collectorCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  collectorAva: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  collectorInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  collectorActions: {},
  callBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepsCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stepRow: { flexDirection: 'row-reverse', gap: 14, marginBottom: 16, position: 'relative' },
  stepLine: { position: 'absolute', right: 22, top: 40, width: 2, height: '70%' },
  stepIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepInfo: { flex: 1, alignItems: 'flex-end', paddingTop: 4 },
  instructionsCard: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  instRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1 },
});
