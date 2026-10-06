import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { DayStrip, SlotGrid, type DayItem } from '../../src/components/consult/ConsultBooking';
import { ConsultScreen, Gate, Section, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import { dateLocaleFor } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Cancel or reschedule — board Consult's form language. The appointment is GET /care/appointments/:id; cancelling is
 * PATCH /care/appointments/:id/cancel with the reason, rescheduling is PATCH /care/appointments/:id/reschedule with the
 * new slot from GET /care/doctors/:id/slots (the next seven days). The refund note is the page's own calculation, as it
 * was; the screen only draws it.
 */

/** The reasons the patient can pick; the server stores the Arabic text of the chosen one, as it always did. */
const CANCEL_REASONS = [
  { id: 'emergency', stored: 'ارتباط طارئ' }, // i18n-ok: the reason as stored on the server, not shown to the user
  { id: 'better', stored: 'تحسّنت صحتي' }, // i18n-ok: stored value
  { id: 'otherDoctor', stored: 'أريد تغيير الطبيب' }, // i18n-ok: stored value
  { id: 'time', stored: 'الوقت لا يناسبني' }, // i18n-ok: stored value
  { id: 'payment', stored: 'مشكلة في الدفع' }, // i18n-ok: stored value
  { id: 'other', stored: 'سبب آخر' }, // i18n-ok: stored value
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

interface Appointment {
  id?: string;
  doctor_id?: string;
  doctor_name?: string;
  doctor?: { name?: string };
  consultation_type?: string;
  scheduled_at?: string;
  price?: number;
  amount_total?: number;
}
interface Slot {
  start?: string;
  slot_start?: string;
  time?: string;
  available?: boolean;
}

export default function CancelRescheduleScreen() {
  const { theme, t, c, flow, lang, k, num } = useScreenUi();
  const { date, clock, money } = useConsultFormat();
  const params = useLocalSearchParams();
  const appointmentId = String(params.appointmentId || params.id || '');

  const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const [selectedReason, setSelectedReason] = useState('');
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Slot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAppointment = useCallback(async () => {
    if (!appointmentId) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const data = await apiFetch<Appointment & { data?: Appointment }>(`/care/appointments/${appointmentId}`);
      setAppointment(data?.data || data);
      setStatus('ready');
    } catch (e) {
      logError('consultations:cancel-reschedule', e);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [appointmentId]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  // Load real availability for the next 7 days when entering reschedule mode
  useEffect(() => {
    if (mode !== 'reschedule' || !appointment?.doctor_id) return;
    const loadSlots = async () => {
      setSlotsLoading(true);
      const out: Record<string, Slot[]> = {};
      const serviceType = appointment.consultation_type === 'home' ? 'home' : appointment.consultation_type === 'video' ? 'video' : 'clinic';
      const days: string[] = [];
      for (let i = 1; i <= 7; i++) days.push(new Date(Date.now() + i * DAY_MS).toISOString().slice(0, 10));
      const results = await Promise.all(
        days.map(async (d): Promise<[string, Slot[]]> => {
          try {
            const res = await apiFetch<Slot[] | { slots?: Slot[]; data?: Slot[] }>(`/care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${serviceType}`);
            const list = Array.isArray(res) ? res : res?.slots || res?.data || [];
            return [d, list.filter((s) => s.available !== false)];
          } catch {
            return [d, []];
          }
        }),
      );
      results.forEach(([d, list]) => {
        if (list.length) out[d] = list;
      });
      setSlotsByDay(out);
      setSlotsLoading(false);
    };
    void loadSlots();
  }, [mode, appointment?.doctor_id, appointment?.consultation_type]);

  const price = Number(appointment?.price ?? appointment?.amount_total ?? 0);
  const scheduledAt = appointment?.scheduled_at ? new Date(appointment.scheduled_at) : null;
  const hoursUntil = scheduledAt ? (scheduledAt.getTime() - Date.now()) / 3600000 : null;
  const refundPct = hoursUntil == null ? null : hoursUntil >= 24 ? 100 : hoursUntil >= 12 ? 50 : 0;

  const dayKeys = useMemo(() => Object.keys(slotsByDay).sort(), [slotsByDay]);
  const [activeDay, setActiveDay] = useState<string>('');
  useEffect(() => {
    if (!activeDay && dayKeys.length) setActiveDay(dayKeys[0]);
  }, [dayKeys, activeDay]);

  const dayItems: DayItem[] = dayKeys.map((d) => {
    const at = new Date(`${d}T00:00:00`);
    const locale = dateLocaleFor(lang);
    return {
      iso: d,
      name: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(at),
      day: num(at.getDate(), { useGrouping: false }),
      month: new Intl.DateTimeFormat(locale, { month: 'short', numberingSystem: 'latn' }).format(at),
    };
  });
  const slotStart = (s: Slot) => s.start || s.slot_start || s.time || '';

  const handleAction = async () => {
    if (!appointmentId) return;
    setIsLoading(true);
    try {
      if (mode === 'cancel') {
        const reason = CANCEL_REASONS.find((r) => r.id === selectedReason)?.stored ?? '';
        await apiFetch(`/care/appointments/${appointmentId}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) });
        showLocalizedAlert(k('consult.cancel.doneTitle'), refundPct && refundPct > 0 && price > 0 ? k('consult.cancel.doneRefund', { pct: num(refundPct) }) : k('consult.cancel.doneBody'), [{ text: k('consult.ok'), onPress: () => router.replace('/consultations/appointments' as Href) }]);
      } else {
        const start = selectedSlot ? slotStart(selectedSlot) : '';
        if (!start) throw new Error(k('consult.cancel.pickSlot'));
        const iso = new Date(start).toISOString();
        await apiFetch(`/care/appointments/${appointmentId}/reschedule`, { method: 'PATCH', body: JSON.stringify({ slot_start: iso }) });
        showLocalizedAlert(k('consult.cancel.rescheduledTitle'), k('consult.cancel.rescheduledBody'), [{ text: k('consult.ok'), onPress: () => router.replace('/consultations/appointments' as Href) }]);
      }
    } catch (e) {
      showLocalizedAlert(k('consult.cancel.failedTitle'), (e instanceof Error && e.message) || k('consult.cancel.failedBody'));
    } finally {
      setIsLoading(false);
    }
  };

  const doctor = appointment?.doctor?.name || appointment?.doctor_name || k('consult.doctorFallback');
  const when = scheduledAt ? `${date(scheduledAt, true)} · ${clock(scheduledAt)}` : '';

  const title = mode === 'cancel' ? k('consult.cancel.reasonTitle') : mode === 'reschedule' ? k('consult.cancel.newSlot') : k('consult.cancel.title');
  const back = mode === 'choose' ? undefined : () => setMode('choose');

  const footer =
    status !== 'ready' ? undefined : mode === 'cancel' ? (
      <Button label={isLoading ? k('consult.cancel.cancelling') : k('consult.cancel.confirm')} variant="danger" size="lg" fullWidth disabled={!selectedReason || isLoading} loading={isLoading} onPress={() => void handleAction()} theme={theme} testID="cancel-confirm" />
    ) : mode === 'reschedule' ? (
      <Button label={isLoading ? k('consult.cancel.rescheduling') : k('consult.cancel.confirmNew')} size="lg" fullWidth disabled={!selectedSlot || isLoading} loading={isLoading} onPress={() => void handleAction()} theme={theme} testID="reschedule-confirm" />
    ) : undefined;

  return (
    <ConsultScreen title={title} onBack={back} footer={footer} testID="cancel-reschedule-screen">
      <Gate status={status} onRetry={() => void loadAppointment()} missingTitle={k('consult.detail.missing')}>
        {mode === 'choose' ? (
          <>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="stethoscope" tone="blue" size={44} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{doctor}</Text>
                  {when ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{when}</Text> : null}
                </View>
              </View>
            </Card>
            <Section title={k('consult.cancel.policy')}>
              <Card theme={theme}>
                {(['consult.cancel.policy24', 'consult.cancel.policy12', 'consult.cancel.policyLess'] as const).map((key, i) => (
                  <View key={key} style={{ paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border.hairline }}>
                    <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k(key)}</Text>
                  </View>
                ))}
              </Card>
            </Section>
            <Button label={k('consult.cancel.reschedule')} size="lg" fullWidth startIcon="calendar-dots" onPress={() => { setSlotsLoading(true); setMode('reschedule'); }} theme={theme} testID="choose-reschedule" />
            <Button label={k('consult.cancel.cancelAppt')} variant="outline" size="md" fullWidth onPress={() => setMode('cancel')} theme={theme} testID="choose-cancel" />
          </>
        ) : mode === 'cancel' ? (
          <>
            <View accessibilityRole="radiogroup" accessibilityLabel={k('consult.cancel.reasonTitle')} style={{ gap: 8 }}>
              {CANCEL_REASONS.map((r) => {
                const on = selectedReason === r.id;
                return (
                  <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k(`consult.cancel.reason.${r.id}`)} onPress={() => setSelectedReason(r.id)} style={{ minHeight: 52, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bg.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.status.danger.fg : c.border.hairline }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? c.status.danger.fg : c.border.strong, alignItems: 'center', justifyContent: 'center' }}>
                      {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.status.danger.fg }} /> : null}
                    </View>
                    <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flex: 1, ...flow }}>{k(`consult.cancel.reason.${r.id}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {refundPct != null && price > 0 ? <Notice tone="warning" text={refundPct > 0 ? k('consult.cancel.refundNote', { pct: num(refundPct), amount: `${money(price)} ${k('consult.currency')}` }) : k('consult.cancel.noRefund')} /> : null}
          </>
        ) : (
          <Section>
            {slotsLoading || dayKeys.length > 0 ? (
              <>
                <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('consult.book.day')}</Text>
                <DayStrip days={dayItems} value={Math.max(0, dayKeys.indexOf(activeDay))} onChange={(i) => { setActiveDay(dayKeys[i]); setSelectedSlot(null); }} label={k('consult.book.day')} />
                <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('consult.book.times')}</Text>
                <SlotGrid loading={slotsLoading} value={selectedSlot ? slotStart(selectedSlot) : null} onChange={(id) => setSelectedSlot((slotsByDay[activeDay] || []).find((s) => slotStart(s) === id) ?? null)} emptyText={k('consult.cancel.noSlots')} slots={(slotsByDay[activeDay] || []).map((s) => ({ id: slotStart(s), label: clock(slotStart(s)), available: true }))} />
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 6, paddingVertical: 32 }}>
                <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, textAlign: 'center' }}>{k('consult.cancel.noSlotsWeek')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('consult.cancel.noSlotsHint')}</Text>
              </View>
            )}
          </Section>
        )}
      </Gate>
    </ConsultScreen>
  );
}
