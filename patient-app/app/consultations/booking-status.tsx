/**
 * Booking status — board BookingConfirm (canvas/BookingConfirm.dc.html) for its three states, as before: confirm (the
 * confirm / payment form in src/components/BookingConfirmForm.tsx) → success (the booking was placed) → pending (the
 * appointment's own status, refresh and cancel). Which state shows, what is called and when the screen moves on are
 * unchanged: this file only draws them with the shared screen, the tokens and the translation files.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card } from '../../../packages/ui-native/src';
import BookingConfirmForm from '../../src/components/BookingConfirmForm';
import { ConsultScreen, ResultHero, StatusTag, appointmentStatus } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { consultationMutationHeaders } from '../../src/utils/consultation-payment';

type Mode = 'confirm' | 'success' | 'pending';

interface Appointment {
  id?: string;
  status?: string;
  service_type?: string;
}

function acceptedRoute(appointment: Appointment | null, fallbackType: string): Href {
  const appointmentId = appointment?.id;
  const type = appointment?.service_type || fallbackType;
  if (type === 'clinic') return { pathname: '/consultations/clinic-confirm', params: { appointmentId } } as unknown as Href;
  if (type === 'home') return { pathname: '/consultations/home-visit-tracking', params: { appointmentId } } as unknown as Href;
  return { pathname: '/consultations/virtual-waiting-room', params: { appointmentId } } as unknown as Href;
}

export default function BookingStatusScreen() {
  const { theme, t, c, k } = useScreenUi();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId ? String(params.appointmentId) : '';
  const visitType = String(params.visitType || 'video');
  const isInsurance = params.isInsurance === 'true';
  const isToday = params.isToday !== 'false';
  const [mode, setMode] = useState<Mode>(params.payment_pending === 'true' ? 'pending' : appointmentId ? 'success' : 'confirm');

  /* ── success: the same spring ── */
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mode !== 'success') return;
    Animated.spring(pop, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
  }, [mode, pop]);

  /* ── pending: the same query and cancel ── */
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const refresh = useCallback(async () => {
    if (!appointmentId) {
      setError(k('consult.status.missingId'));
      return;
    }
    setRefreshing(true);
    setError('');
    try {
      setAppointment(await apiFetch<Appointment>(`/care/appointments/${encodeURIComponent(appointmentId)}`));
    } catch (reason) {
      setError((reason instanceof Error && reason.message) || k('consult.status.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  }, [appointmentId, k]);

  useEffect(() => {
    if (mode === 'pending') void refresh();
  }, [mode, refresh]);

  const status = appointment?.status || 'PENDING';
  const confirmed = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(status);
  const cancelled = ['CANCELLED', 'NO_SHOW'].includes(status);

  useEffect(() => {
    if (mode === 'pending' && confirmed) router.push(acceptedRoute(appointment, visitType));
  }, [mode, confirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = () =>
    showLocalizedAlert(k('consult.status.cancelTitle'), k('consult.status.cancelBody'), [
      { text: k('consult.back'), style: 'cancel' },
      {
        text: k('consult.status.cancelTitle'),
        style: 'destructive',
        onPress: async () => {
          if (!appointmentId) return;
          setCancelling(true);
          try {
            const updated = await apiFetch<Appointment>(`/care/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
              method: 'PATCH',
              headers: consultationMutationHeaders('cancel', appointmentId),
              body: JSON.stringify({ reason: 'patient_cancelled' }),
            });
            setAppointment(updated || { ...appointment, status: 'CANCELLED' });
          } catch (reason) {
            showLocalizedAlert(k('consult.status.cancelFailed'), (reason instanceof Error && reason.message) || k('consult.confirm.tryLater'));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);

  /* ── 1: confirm and pay (the original logic, as it was) ── */
  if (mode === 'confirm') return <BookingConfirmForm />;

  /* ── 2: the booking was placed ── */
  if (mode === 'success') {
    return (
      <ConsultScreen
        title={k('consult.status.title')}
        testID="booking-success-screen"
        footer={
          <>
            {appointmentId ? <Button label={k('consult.status.track')} size="lg" fullWidth onPress={() => setMode('pending')} theme={theme} testID="booking-track" /> : null}
            <Button label={k('consult.appt.title')} variant="outline" size="md" fullWidth onPress={() => router.push((!isToday || isInsurance ? '/consultations/appointments' : '/(tabs)/consultations') as Href)} theme={theme} />
          </>
        }
      >
        <ResultHero icon="check-circle" tone="success" title={k('consult.status.placed')} body={isInsurance ? k('consult.status.awaitingInsurance') : k('consult.status.prepare')} pop={pop} />
      </ConsultScreen>
    );
  }

  /* ── 3: the appointment's status ── */
  const look = appointmentStatus(status);
  return (
    <ConsultScreen
      title={k('consult.status.current')}
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      testID="booking-pending-screen"
      footer={
        <>
          <Button label={refreshing ? k('consult.status.refreshing') : k('consult.status.refresh')} size="lg" fullWidth disabled={refreshing} onPress={() => void refresh()} theme={theme} testID="booking-refresh" />
          {!cancelled && !confirmed ? <Button label={cancelling ? k('consult.status.cancelling') : k('consult.status.cancelTitle')} variant="danger" size="md" fullWidth disabled={cancelling} onPress={cancel} theme={theme} testID="booking-cancel" /> : null}
        </>
      }
    >
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{k('consult.status.now')}</Text>
          <StatusTag label={k(look.key)} tone={look.tone} />
          {error ? <Text accessibilityRole="alert" style={{ ...scale(t, 'small', 'regular'), color: c.status.danger.fg, textAlign: 'center' }}>{error}</Text> : null}
        </View>
      </Card>
    </ConsultScreen>
  );
}
