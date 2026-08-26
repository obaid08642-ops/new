// @ts-nocheck
/**
 * M4-FE1 · شاشة انتظار قبول المزود (المريض)
 * يستطلع GET /appointments/:id كل 5 ثوانٍ حتى:
 *  - CONFIRMED → توجيه حسب نوع الخدمة (عيادة/منزل/فيديو) بمعرّف الموعد الحقيقي
 *  - CANCELLED → إشعار استرداد حسب سياسة الإلغاء
 *  - انتهاء مهلة الانتظار → خيار الإلغاء مع الاسترداد
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, StatusBar, TouchableOpacity, Alert, Easing } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const POLL_MS = 5000;
const WAIT_LIMIT_MIN = 15; // مهلة انتظار قبول المزود

export default function BookingPendingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const AR = lang !== 'en';
  const params = useLocalSearchParams<{ appointmentId?: string; visitType?: string }>();
  const appointmentId = params.appointmentId;
  const visitType = params.visitType || 'video';

  const [appt, setAppt] = useState<any>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [cancelling, setCancelling] = useState(false);
  const [phase, setPhase] = useState<'waiting' | 'accepted' | 'rejected'>('waiting');
  const timerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const routeAccepted = useCallback((a: any) => {
    const type = a?.service_type || visitType;
    const id = a?.id || appointmentId;
    if (type === 'clinic') {
      router.replace({ pathname: '/consultations/clinic-confirm', params: { appointmentId: id } });
    } else if (type === 'home') {
      router.replace({ pathname: '/consultations/home-visit-tracking', params: { appointmentId: id } });
    } else {
      router.replace({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: id } });
    }
  }, [visitType, appointmentId]);

  const poll = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const res = await apiFetch<any>(`/care/appointments/${appointmentId}`);
      if (!res) return;
      setAppt(res);
      setLoadErr(null);
      const st = res.status;
      if (['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(st)) {
        setPhase('accepted');
        setTimeout(() => routeAccepted(res), 1400);
      } else if (['CANCELLED', 'NO_SHOW'].includes(st)) {
        setPhase('rejected');
      }
    } catch (e: any) {
      setLoadErr(e?.message || (AR ? 'تعذر تحديث الحالة' : 'Failed to refresh status'));
    }
  }, [appointmentId, AR, routeAccepted]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [poll]);

  useEffect(() => {
    if (phase !== 'waiting') {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    }
  }, [phase]);

  const overLimit = elapsed >= WAIT_LIMIT_MIN * 60;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const handleCancel = () => {
    showLocalizedAlert(
      AR ? 'إلغاء الحجز' : 'Cancel booking',
      AR ? 'سيُلغى الحجز ويُسترد المبلغ حسب سياسة الإلغاء (100% قبل 24 ساعة). هل أنت متأكد؟' : 'The booking will be cancelled and refunded per policy (100% before 24h). Are you sure?',
      [
        { text: AR ? 'تراجع' : 'Back', style: 'cancel' },
        {
          text: AR ? 'نعم، إلغاء' : 'Yes, cancel', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await apiFetch(`/care/appointments/${appointmentId}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'patient_cancelled_while_waiting' }) });
              setPhase('rejected');
            } catch (e: any) {
              showLocalizedAlert(AR ? 'خطأ' : 'Error', e?.message || (AR ? 'تعذر الإلغاء' : 'Cancellation failed'));
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // ── Rejected / Cancelled state ────────────────────────────────────────────
  if (phase === 'rejected') {
    return (
      <View style={[st.c, { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingHorizontal: 24 }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={[st.iconCircle, { backgroundColor: colors.errorSurface || '#FFEBEE' }]}>
            <Icon name="close" size={44} color={colors.error} />
          </View>
          <AppText variant="h3" style={{ textAlign: 'center' }}>{AR ? 'لم يتم تأكيد الحجز' : 'Booking not confirmed'}</AppText>
          <AppText variant="bodyMD" color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 22 }}>
            {AR
              ? 'اعتذر المزود أو أُلغي الموعد. إن كان قد تم خصم أي مبلغ فسيُسترد كاملًا إلى وسيلة الدفع خلال 3–5 أيام عمل.'
              : 'The provider declined or the appointment was cancelled. Any charged amount will be fully refunded within 3–5 business days.'}
          </AppText>
          <View style={{ width: '100%', marginTop: 20, gap: 12 }}>
            <Button label={AR ? 'حجز موعد آخر' : 'Book another appointment'} onPress={() => router.replace('/consultations/doctor-search')} />
            <Button variant="outline" label={AR ? 'العودة للرئيسية' : 'Back to home'} onPress={() => router.replace('/(tabs)')} />
          </View>
        </View>
      </View>
    );
  }

  // ── Accepted flash state ──────────────────────────────────────────────────
  if (phase === 'accepted') {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 14 }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[st.iconCircle, { backgroundColor: colors.successSurface || '#E8F5E9' }]}>
          <Icon name="check_circle" size={44} color={colors.success} />
        </View>
        <AppText variant="h3">{AR ? 'تم قبول حجزك' : 'Booking accepted'}</AppText>
        <AppText variant="bodyMD" color={colors.textSecondary}>{AR ? 'جارٍ تجهيز موعدك…' : 'Preparing your appointment…'}</AppText>
      </View>
    );
  }

  // ── Waiting state ─────────────────────────────────────────────────────────
  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
        <Animated.View style={[st.iconCircle, { backgroundColor: colors.primarySurface, transform: [{ scale: pulse }] }]}>
          <Icon name="clock" size={44} color={colors.primary} />
        </Animated.View>

        <AppText variant="h3" style={{ marginTop: 20, textAlign: 'center' }}>
          {AR ? 'بانتظار قبول المزود' : 'Waiting for provider acceptance'}
        </AppText>
        <AppText variant="bodyMD" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          {AR
            ? 'تم إرسال حجزك. سيؤكد المزود الموعد خلال دقائق، وستنتقل تلقائيًا فور القبول.'
            : 'Your booking was sent. The provider will confirm within minutes and you will be moved automatically.'}
        </AppText>

        <View style={[st.timerPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="clock" size={16} color={colors.textTertiary} />
          <AppText variant="labelMD" color={colors.textSecondary}>{mm}:{ss}</AppText>
        </View>

        {overLimit && (
          <Card style={{ marginTop: 18, borderColor: colors.warning || '#FF9500', borderWidth: 1 }}>
            <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>
              {AR
                ? 'تجاوز الانتظار المدة المعتادة. يمكنك الاستمرار بالانتظار أو الإلغاء مع استرداد كامل.'
                : 'The wait exceeded the usual time. You can keep waiting or cancel with a full refund.'}
            </AppText>
          </Card>
        )}
        {!!loadErr && (
          <AppText variant="caption" color={colors.error} style={{ marginTop: 10 }}>{loadErr}</AppText>
        )}
      </View>

      <View style={{ padding: 20, paddingBottom: insets.bottom + 16, gap: 12 }}>
        <Button
          variant="outline"
          label={cancelling ? (AR ? 'جارٍ الإلغاء…' : 'Cancelling…') : (AR ? 'إلغاء الحجز واسترداد المبلغ' : 'Cancel & refund')}
          onPress={handleCancel}
          disabled={cancelling}
        />
        <TouchableOpacity onPress={poll} style={{ alignSelf: 'center' }}>
          <AppText variant="labelSM" color={colors.primary}>{AR ? 'تحديث الحالة الآن' : 'Refresh status now'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  iconCircle: { width: 96, height: 96, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  timerPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
