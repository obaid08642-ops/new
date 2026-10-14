import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, Segmented } from '../../../packages/ui-native/src';
import { DoctorHead, ModeTiles } from './consult/ConsultBooking';
import { ConsultScreen, useConsultFormat } from './consult/ConsultKit';
import { Notice } from './pharmacy/OfferKit';
import { step as scale, useScreenUi } from './screen/ScreenKit';
import { useGuestGuard } from '../hooks/useGuestGuard';
import { apiFetch } from '../utils/api';
import { paymentIntentHeaders } from '../utils/payment-idempotency';
import { appointmentMutationHeaders, isHttpsCheckout } from '../utils/consultation-payment';
import { pickLocalized } from '../utils/localize';
import { showLocalizedAlert } from '../components/LocalizedAlert';

/**
 * Confirm the booking — board BookingConfirm (canvas/BookingConfirm.dc.html), the first state of booking-status. The
 * confirm / payment / insurance logic is the one that was here, untouched: this file only draws it with the shared
 * screen, the tokens and the translation files. The board's fee summary, points discount and report attachment are not
 * drawn: the price is the server's to state at the payment step, and there is no points or attachment flow here.
 */

interface DoctorLite {
  name_ar?: string;
  name_en?: string;
  display_name?: string;
  name?: string;
  specialty_ar?: string;
  specialty?: string;
  photo_url?: string;
  rating_avg?: number;
  rating_count?: number;
}
interface InsuranceLite {
  provider_id?: string;
  company_id?: string;
  policy_number?: string;
  member_id?: string;
}
interface CreatedAppointment {
  id?: string;
  insurance_request_id?: string;
}

const VISIT_TYPES = ['video', 'clinic', 'home'] as const;
const MODE_OF = { video: 'online', clinic: 'clinic', home: 'home' } as const;

export default function BookingConfirmScreen() {
  const { theme, t, c, flow, k } = useScreenUi();
  const { date, clock } = useConsultFormat();
  const params = useLocalSearchParams();
  const { isGuest, requireAuth } = useGuestGuard();
  const [visitType, setVisitType] = useState((params.visitType as string) || 'clinic');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'insurance'>('card');
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<DoctorLite | null>(null);
  const [insurance, setInsurance] = useState<InsuranceLite | null>(null);

  useEffect(() => {
    if (!params.doctorId) return;
    apiFetch<DoctorLite>(`/care/doctors/${encodeURIComponent(String(params.doctorId))}`)
      .then((res) => setDoctor(res || null))
      .catch(() => setDoctor(null));
  }, [params.doctorId]);

  useEffect(() => {
    if (isGuest || payMethod !== 'insurance') return;
    apiFetch<{ insurance?: InsuranceLite | null }>('/users/me/profile')
      .then((profile) => setInsurance(profile?.insurance || null))
      .catch(() => setInsurance(null));
  }, [isGuest, payMethod]);

  const slotStartIso = useMemo(() => {
    if (params.slot_start) {
      const slot = new Date(String(params.slot_start));
      return Number.isNaN(slot.getTime()) ? '' : slot.toISOString();
    }
    if (params.date && params.time) {
      const time = String(params.time).length === 5 ? String(params.time) : '09:00';
      const slot = new Date(`${params.date}T${time}:00`);
      return Number.isNaN(slot.getTime()) ? '' : slot.toISOString();
    }
    return '';
  }, [params.date, params.slot_start, params.time]);

  const slotLabel = slotStartIso ? `${date(slotStartIso, true)} · ${clock(slotStartIso)}` : k('consult.confirm.noSlot');
  const insuranceReady = Boolean(insurance?.provider_id || insurance?.company_id || insurance?.policy_number);

  const handleConfirm = async () => {
    if (!slotStartIso || !params.doctorId) {
      showLocalizedAlert(k('consult.confirm.missingTitle'), k('consult.confirm.missingBody'));
      return;
    }
    if (payMethod === 'insurance' && isGuest) {
      requireAuth('insurance');
      return;
    }
    if (payMethod === 'insurance' && !insuranceReady) {
      showLocalizedAlert(k('consult.confirm.insuranceMissingTitle'), k('consult.confirm.insuranceMissingBody'));
      return;
    }

    setLoading(true);
    try {
      // Hold the slot first (10-min TTL, POST /slot-locks/reserve): the server
      // consumes the lock on booking success and releases it on failure, so a
      // double-tap or a second device can never double-book the same slot (P3-e).
      let slotLockId: string | undefined;
      try {
        const lock = await apiFetch<{ id?: string; data?: { id?: string } }>('/slot-locks/reserve', {
          method: 'POST',
          body: JSON.stringify({ provider_id: params.doctorId, booking_kind: 'consultation', slot_start: slotStartIso }),
        });
        slotLockId = lock?.id || lock?.data?.id;
      } catch (lockErr) {
        const code = String(lockErr instanceof Error ? lockErr.message : '');
        if (code.includes('slot_taken')) throw new Error(k('consult.confirm.slotTaken'));
        if (code.includes('lock_')) throw new Error(k('consult.confirm.lockFailed'));
        throw lockErr;
      }
      const appointment = await apiFetch<CreatedAppointment>('/care/appointments', {
        method: 'POST',
        headers: appointmentMutationHeaders(params.doctorId, slotStartIso),
        body: JSON.stringify({
          doctor_id: params.doctorId,
          service_type: visitType,
          slot_start: slotStartIso,
          payment_method: payMethod,
          insurance_provider: payMethod === 'insurance' ? (insurance?.provider_id || insurance?.company_id) : undefined,
          insurance_member_id: payMethod === 'insurance' ? (insurance?.policy_number || insurance?.member_id) : undefined,
          patient_notes: params.notes ? String(params.notes) : undefined,
          visit_location: visitType === 'home' && params.visit_lat && params.visit_lng
            ? { lat: Number(params.visit_lat), lng: Number(params.visit_lng), address: String(params.visit_address || '') }
            : undefined,
          slot_lock_id: slotLockId,
        }),
      });
      if (!appointment?.id) throw new Error(k('consult.confirm.createFailed'));

      if (payMethod === 'insurance') {
        if (!appointment.insurance_request_id) throw new Error(k('consult.confirm.insuranceRequestFailed'));
        router.replace({ pathname: '/insurance/request', params: { id: appointment.insurance_request_id, appointmentId: appointment.id, booking_kind: 'consultation' } } as unknown as Href);
        return;
      }

      if (payMethod === 'card') {
        const capabilities = await apiFetch<{ methods?: Array<{ id?: string }> }>(`/payments/consultation/${encodeURIComponent(appointment.id)}/capabilities`);
        const method = capabilities?.methods?.find((item) => item?.id === 'card')?.id;
        if (method !== 'card') throw new Error(k('consult.confirm.cardUnavailable'));
        const transaction = await apiFetch<{ checkout_url?: string }>(`/payments/intent/consultation/${encodeURIComponent(appointment.id)}`, {
          method: 'POST',
          headers: paymentIntentHeaders('consultation', appointment.id),
          body: JSON.stringify({ method }),
        });
        if (!isHttpsCheckout(transaction?.checkout_url)) throw new Error(k('consult.confirm.checkoutUnavailable'));
        await Linking.openURL(transaction.checkout_url);
      }

      // Opening checkout never marks an appointment paid or confirmed in the client.
      router.replace({ pathname: '/consultations/booking-status', params: { appointmentId: appointment.id, visitType, payment_pending: payMethod === 'card' ? 'true' : 'false' } } as unknown as Href);
    } catch (error) {
      showLocalizedAlert(k('consult.confirm.failedTitle'), (error instanceof Error && error.message) || k('consult.confirm.tryLater'));
    } finally {
      setLoading(false);
    }
  };

  const options = visitType === 'clinic'
    ? [{ value: 'card', label: k('consult.confirm.card') }, { value: 'cash', label: k('consult.confirm.cash') }, { value: 'insurance', label: k('consult.confirm.insurance') }]
    : [{ value: 'card', label: k('consult.confirm.card') }, { value: 'insurance', label: k('consult.confirm.insurance') }];
  const hint = payMethod === 'insurance' ? 'consult.confirm.hintInsurance' : payMethod === 'card' ? 'consult.confirm.hintCard' : 'consult.confirm.hintCash';
  const submit = payMethod === 'insurance' ? 'consult.confirm.submitInsurance' : payMethod === 'card' ? 'consult.confirm.submitCard' : 'consult.confirm.submitCash';

  const footer = (
    <Button label={k(submit)} size="lg" fullWidth startIcon={payMethod === 'insurance' ? 'shield-check' : 'check-circle'} loading={loading} disabled={loading || (payMethod === 'insurance' && !insuranceReady)} onPress={() => void handleConfirm()} theme={theme} testID="booking-confirm-submit" />
  );

  return (
    <ConsultScreen title={k('consult.confirm.title')} footer={footer} testID="booking-confirm-screen">
      <DoctorHead
        name={pickLocalized(doctor?.name_ar, doctor?.name_en) || doctor?.display_name || doctor?.name || k('consult.confirm.doctorFallback')}
        line={[doctor?.specialty_ar || doctor?.specialty].filter(Boolean).join(' · ')}
        photo={doctor?.photo_url}
        rating={doctor?.rating_avg}
        count={doctor?.rating_count}
      />

      <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('consult.book.visitType')}</Text>
      <ModeTiles tiles={VISIT_TYPES.map((v) => ({ id: v, mode: MODE_OF[v], price: null }))} value={visitType} onChange={setVisitType} label={k('consult.book.visitType')} />

      <Card theme={theme} padding="sm">
        <View style={{ gap: 4 }}>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.confirm.when')}</Text>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{slotLabel}</Text>
        </View>
      </Card>

      {params.notes ? (
        <Card theme={theme} padding="sm">
          <View style={{ gap: 4 }}>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.confirm.reason')}</Text>
            <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.primary, ...flow }}>{String(params.notes)}</Text>
          </View>
        </Card>
      ) : null}

      <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('consult.confirm.payTitle')}</Text>
      <Segmented label={k('consult.confirm.payTitle')} value={payMethod} onChange={(v) => setPayMethod(v === 'cash' ? 'cash' : v === 'insurance' ? 'insurance' : 'card')} options={options} theme={theme} testID="booking-pay-method" />
      <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k(hint)}</Text>

      {payMethod === 'insurance' ? (
        <>
          <Notice tone={insuranceReady ? 'info' : 'warning'} text={k(insuranceReady ? 'consult.confirm.insuranceReady' : 'consult.confirm.insuranceNotReady')} />
          <Button label={k('consult.confirm.manageInsurance')} variant="ghost" size="md" onPress={() => router.push({ pathname: '/insurance', params: { tab: 'policy' } } as unknown as Href)} theme={theme} />
        </>
      ) : null}

      <Notice tone="info" text={k('consult.confirm.stepsNote')} />
    </ConsultScreen>
  );
}
