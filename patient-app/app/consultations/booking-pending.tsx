// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { consultationMutationHeaders } from '../../src/utils/consultation-payment';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

function acceptedRoute(appointment: any, fallbackType: string) {
  const appointmentId = appointment?.id;
  const type = appointment?.service_type || fallbackType;
  if (type === 'clinic') return { pathname: '/consultations/clinic-confirm', params: { appointmentId } };
  if (type === 'home') return { pathname: '/consultations/home-visit-tracking', params: { appointmentId } };
  return { pathname: '/consultations/virtual-waiting-room', params: { appointmentId } };
}

export default function BookingPendingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const AR = lang !== 'en';
  const params = useLocalSearchParams<{ appointmentId?: string; visitType?: string; payment_pending?: string }>();
  const appointmentId = params.appointmentId;
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment identifier'); return; }
    setRefreshing(true); setError('');
    try { setAppointment(await apiFetch<any>(`/care/appointments/${encodeURIComponent(appointmentId)}`)); }
    catch (reason: any) { setError(reason?.message || (AR ? 'تعذر تحديث حالة الموعد' : 'Unable to refresh appointment status')); }
    finally { setRefreshing(false); }
  }, [AR, appointmentId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const cancel = () => showLocalizedAlert(AR ? 'إلغاء الحجز' : 'Cancel appointment', AR ? 'سيقرر الخادم أهلية الإلغاء والاسترداد من مصدر الدفع الموثق. هل تريد المتابعة؟' : 'The server will determine cancellation and any refund from the verified payment source. Continue?', [
    { text: AR ? 'رجوع' : 'Back', style: 'cancel' },
    { text: AR ? 'إلغاء الحجز' : 'Cancel appointment', style: 'destructive', onPress: async () => {
      if (!appointmentId) return;
      setCancelling(true);
      try { const updated = await apiFetch<any>(`/care/appointments/${encodeURIComponent(appointmentId)}/cancel`, { method: 'PATCH', headers: consultationMutationHeaders('cancel', appointmentId), body: JSON.stringify({ reason: 'patient_cancelled' }) }); setAppointment(updated || { ...appointment, status: 'CANCELLED' }); }
      catch (reason: any) { showLocalizedAlert(AR ? 'تعذر الإلغاء' : 'Cancellation failed', reason?.message || (AR ? 'حاول مرة أخرى.' : 'Try again.')); }
      finally { setCancelling(false); }
    } },
  ]);

  const status = appointment?.status || 'PENDING';
  const confirmed = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(status);
  const cancelled = ['CANCELLED', 'NO_SHOW'].includes(status);
  const awaitingPayment = params.payment_pending === 'true' && !confirmed && !cancelled;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.iconCircle, { backgroundColor: cancelled ? colors.errorSurface : confirmed ? colors.successSurface : colors.primarySurface }]}><Icon name={cancelled ? 'close' : confirmed ? 'check_circle' : 'clock'} size={44} color={cancelled ? colors.error : confirmed ? colors.success : colors.primary} /></View>
      <AppText variant="h3" align="center">{cancelled ? (AR ? 'لم يعد الحجز نشطاً' : 'Appointment is no longer active') : confirmed ? (AR ? 'الموعد مؤكد' : 'Appointment confirmed') : awaitingPayment ? (AR ? 'بانتظار تحقق الدفع' : 'Waiting for payment verification') : (AR ? 'بانتظار مراجعة الموعد' : 'Appointment pending review')}</AppText>
      <AppText variant="bodyMD" color={colors.textSecondary} align="center" style={styles.message}>{cancelled ? (AR ? 'إذا كانت هناك معاملة مدفوعة، يعالج الخادم أي استرداد وفق السياسة ومن مصدر الدفع الموثق.' : 'If a payment was made, the server processes any refund under policy to its verified payment source.') : confirmed ? (AR ? 'حدّث الخادم حالة الموعد. يمكنك المتابعة إلى تفاصيل الموعد.' : 'The server has updated the appointment. You can continue to its details.') : awaitingPayment ? (AR ? 'تم فتح بوابة الدفع. لا يعتبر الموعد مدفوعاً أو مؤكداً حتى يتحقق الخادم من العملية.' : 'Checkout was opened. The appointment is not paid or confirmed until the server verifies the transaction.') : (AR ? 'يتطلب الموعد قرار المزود أو قرار التأمين. استخدم التحديث اليدوي لمراجعة الحالة.' : 'The appointment requires a provider or insurance decision. Use manual refresh to review the status.')}</AppText>
      {!!error && <Card style={{ backgroundColor: colors.errorSurface }}><AppText variant="bodySM" color={colors.error}>{error}</AppText></Card>}
      {appointment?.insurance_request_id && !confirmed && !cancelled && <Button variant="outline" label={AR ? 'عرض قرار التأمين' : 'View insurance decision'} onPress={() => router.push({ pathname: '/insurance/payment-split', params: { request_id: appointment.insurance_request_id, appointmentId: appointment.id, booking_kind: 'consultation' } })} />}
      <View style={styles.actions}>
        {confirmed && <Button label={AR ? 'فتح تفاصيل الموعد' : 'Open appointment details'} onPress={() => router.replace(acceptedRoute(appointment, params.visitType || 'video'))} />}
        {!confirmed && !cancelled && <Button variant="outline" label={refreshing ? (AR ? 'جارٍ التحديث…' : 'Refreshing…') : (AR ? 'تحديث الحالة يدوياً' : 'Refresh status')} onPress={refresh} disabled={refreshing || cancelling} />}
        {!confirmed && !cancelled && <Button variant="outline" label={cancelling ? (AR ? 'جارٍ الإلغاء…' : 'Cancelling…') : (AR ? 'إلغاء الحجز' : 'Cancel appointment')} onPress={cancel} disabled={cancelling || refreshing} />}
        {cancelled && <TouchableOpacity onPress={() => router.replace('/consultations/doctor-search')}><AppText variant="labelSM" color={colors.primary}>{AR ? 'حجز موعد آخر' : 'Book another appointment'}</AppText></TouchableOpacity>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 }, iconCircle: { width: 96, height: 96, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }, message: { lineHeight: 22 }, actions: { width: '100%', gap: 12, marginTop: 8, alignItems: 'center' } });
