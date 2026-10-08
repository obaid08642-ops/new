import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { ConsultScreen, Dialog, Gate, InfoRow, ModePill, Section, StatusTag, appointmentStatus, useConsultFormat, visitMode, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { HistorySection, PrescriptionSection, SummarySection, openFollowUp, type HistoryRow, type Summary } from '../../src/components/consult/AppointmentSections';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { statusIs } from '../../src/utils/statusCase';

/**
 * Appointment details — board Consult's card language. One page for the whole booking (merge map 2, section 1): status,
 * the doctor's summary, the prescription and the follow-up, which were three more screens reading the same appointment.
 * Everything is GET /care/appointments/:id: the status and the
 * date, the doctor, the visit type, the payment method, the booking number and the amount when the server states
 * one. What the page offers depends on the visit type and status, as before: cancel or reschedule, the waiting room,
 * the clinic's place or the visit tracking, the summary and the rating after a finished visit, and the insurance
 * co-pay step while the appointment waits for it (GET /insurance/requests/my).
 */

interface Appointment {
  id?: string;
  status?: string;
  scheduled_at?: string;
  consultation_type?: string;
  service_type?: string;
  patient_notes?: string;
  state_history?: HistoryRow[];
  payment_method?: string;
  doctor_id?: string;
  doctor_name?: string;
  specialty?: string;
  doctor?: { name?: string; specialty?: string };
  price?: number;
  amount?: number;
  copay_amount?: number;
}
interface InsuranceRequest {
  id?: string;
  booking_kind?: string;
  booking_id?: string;
  state?: string;
}

const OPEN_STATES = ['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID'];
const TIPS = ['consult.detail.tip1', 'consult.detail.tip2', 'consult.detail.tip3', 'consult.detail.tip4'] as const;

export default function AppointmentDetailScreen() {
  const { theme, t, c, flow, k } = useScreenUi();
  const { date, clock, money } = useConsultFormat();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    if (!params.appointmentId) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const res = await apiFetch<Appointment>(`/care/appointments/${params.appointmentId}`);
      setAppointment(res || null);
      setStatus(res ? 'ready' : 'missing');
    } catch (e) {
      logError('consultations:appointment-detail', e);
      setAppointment(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [params.appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const a = appointment;
  const mode = visitMode(a?.consultation_type || a?.service_type);
  const st = appointmentStatus(a?.status);
  const done = statusIs(a?.status, ['completed']);
  const doctorName = a?.doctor?.name || a?.doctor_name || '';
  const specialty = a?.doctor?.specialty || a?.specialty || '';
  const amount = a?.price ?? a?.amount ?? null;
  const pay = a?.payment_method === 'insurance' ? 'consult.pay.insurance' : a?.payment_method === 'cash' ? 'consult.pay.cash' : a?.payment_method ? 'consult.pay.card' : '';
  const at = a?.scheduled_at;
  const id = String(a?.id || '');

  const go = (pathname: string, extra?: Record<string, unknown>) => router.push({ pathname, params: { appointmentId: id, ...extra } } as unknown as Href);

  const payCopay = () => {
    apiFetch<InsuranceRequest[]>('/insurance/requests/my')
      .then((requests) => {
        const request = (requests || []).find((item) => item.booking_kind === 'consultation' && item.booking_id === a?.id && OPEN_STATES.includes(String(item.state)));
        if (!request?.id) throw new Error('insurance_request_not_found');
        router.push({ pathname: '/insurance/request', params: { id: request.id } } as unknown as Href);
      })
      .catch(() => showLocalizedAlert(k('consult.detail.insuranceUnavailable'), k('consult.detail.insuranceUnavailableBody')));
  };

  const primary =
    mode === 'online'
      ? { label: k('consult.detail.waitingRoom'), onPress: () => go('/consultations/virtual-waiting-room') }
      : mode === 'clinic'
        ? { label: k('consult.detail.clinicPlace'), onPress: () => go('/consultations/booking-status', { state: 'confirmed', view: 'location' }) }
        : mode === 'home'
          ? { label: k('consult.detail.trackDoctor'), onPress: () => go('/consultations/home-visit-tracking') }
          : null;

  const footer = a ? (
    <>
      {primary ? <Button label={primary.label} size="lg" fullWidth onPress={primary.onPress} theme={theme} testID="detail-primary" /> : null}
      <Button label={k('consult.appt.editCancel')} variant="outline" size="md" fullWidth onPress={() => go('/consultations/cancel-reschedule')} theme={theme} testID="detail-cancel" />
    </>
  ) : undefined;

  return (
    <ConsultScreen title={k('consult.detail.title')} footer={footer} testID="appointment-detail-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.detail.missing')}>
        {a ? (
          <>
            <Card theme={theme}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <StatusTag label={k(st.key)} tone={st.tone} />
                {at ? <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{date(at, true)}</Text> : null}
                {at ? <Text style={{ ...scale(t, 'bodyLg', 'medium'), color: c.text.secondary, textAlign: 'center' }}>{clock(at)}</Text> : null}
              </View>
            </Card>

            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="stethoscope" tone="blue" size={48} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{doctorName || k('consult.doctorFallback')}</Text>
                  {specialty ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{specialty}</Text> : null}
                </View>
                {a.doctor_id ? <Button label={k('consult.detail.viewProfile')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/consultations/doctor/[id]', params: { id: a.doctor_id } } as unknown as Href)} theme={theme} /> : null}
              </View>
            </Card>

            <Section title={k('consult.detail.info')}>
              <Card theme={theme}>
                {mode ? (
                  <View style={{ paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{k('consult.detail.visitType')}</Text>
                    <ModePill mode={mode} />
                  </View>
                ) : null}
                <InfoRow label={k('consult.detail.date')} value={at ? date(at, true) : ''} />
                <InfoRow label={k('consult.detail.time')} value={at ? clock(at) : ''} />
                <InfoRow label={k('consult.detail.payment')} value={pay ? k(pay) : ''} />
                <InfoRow label={k('consult.detail.number')} value={id.substring(0, 8).toUpperCase()} last={amount === null} />
                {amount !== null ? <InfoRow label={k('consult.detail.amount')} value={`${money(Number(amount))} ${k('consult.currency')}`} strong last /> : null}
              </Card>
            </Section>

            {done ? (
              <>
                <Pressable accessibilityRole="button" accessibilityLabel={k('consult.detail.rate')} onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'appointment', booking_id: a.id, providerName: doctorName } } as unknown as Href)} style={{ minHeight: 44 }}>
                  <Card theme={theme} padding="sm">
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <FIcon icon="star" tone="amber" size={44} theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('consult.detail.rate')}</Text>
                        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.detail.rateBody')}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </>
            ) : null}

            {a.doctor_id ? (
              <Button label={k('consult.follow.chat')} variant="outline" size="md" fullWidth startIcon="chat-circle-text" onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: a.doctor_id, appointmentId: id } } as unknown as Href)} theme={theme} testID="detail-chat" />
            ) : null}

            {done ? <SummarySection appointmentId={id} doctorId={a.doctor_id || ''} onSummary={setSummary} /> : null}
            {done ? <PrescriptionSection appointmentId={id} fallback={summary?.prescription} /> : null}
            <HistorySection notes={a.patient_notes} history={a.state_history} />
            {done && a.doctor_id ? <Button label={k('consult.rx.followUp')} variant="outline" size="md" fullWidth startIcon="calendar-dots" onPress={() => openFollowUp(a.doctor_id || '', id)} theme={theme} testID="detail-follow-up" /> : null}

            <Section title={k('consult.detail.prepare')}>
              <Card theme={theme}>
                {TIPS.map((tip) => (
                  <View key={tip} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 }}>
                    <Glyph name="check-circle" size={18} color={c.status.success.fg} />
                    <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, flex: 1, ...flow }}>{k(tip)}</Text>
                  </View>
                ))}
              </Card>
            </Section>

            {/* Insurance co-pay lock */}
            <Dialog open={statusIs(a.status, ['pending_copay'])} icon="shield-check" title={k('consult.detail.copayTitle')} body={k('consult.detail.copayBody', { amount: `${money(a.copay_amount || 0)} ${k('consult.currency')}` })}>
              <Button label={k('consult.detail.copayAction')} size="md" fullWidth onPress={payCopay} theme={theme} />
              <Button label={k('consult.detail.copayCancel')} variant="outline" size="md" fullWidth onPress={() => router.back()} theme={theme} />
            </Dialog>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
