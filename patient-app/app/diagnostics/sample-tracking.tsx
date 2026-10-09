import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CARE_TONE, ConsultScreen, Gate, InfoRow, StatusTag, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Block, ListCard, PersonRow, Timeline, TrackHead, diagStatus, goBackDiag, type TimelineStep } from '../../src/components/diagnostics/DiagKit';
import { StatusPill } from '../../src/components/orders/OrderKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { recordOf } from '../../src/utils/labMappers';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

// What a sample goes through when the server sent no steps of its own: the first is done (the order was received), the second when a technician is assigned.
const DEFAULT_STEPS = ['diag.track.step1', 'diag.track.step2', 'diag.track.step3', 'diag.track.step4', 'diag.track.step5', 'diag.track.step6'];

/** Tracking of a lab sample (board OrderTracking): the status, the time, the technician block (arrival, who, call, tips) for a home collection, the preparation note and the steps. Also the old technician-tracking screen. Refreshes every 15 seconds. */
export default function SampleTrackingScreen() {
  const { t, c, k, num, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [status, setStatus] = useState<GateStatus>('loading');
  const [tracking, setTracking] = useState<Rec | null>(null);
  const [booking, setBooking] = useState<Rec | null>(null);

  const fetchTracking = useCallback(
    async (isStopped: () => boolean) => {
      try {
        const [bookingRes, trackRes] = await Promise.all([apiFetch<unknown>(`/labs/bookings/${bookingId}`).catch(() => null), apiFetch<unknown>(`/labs/bookings/${bookingId}/tracking`).catch(() => null)]);
        if (isStopped()) return;
        const b = recordOf(bookingRes);
        const tr = recordOf(trackRes);
        if (b) setBooking(b);
        if (tr) setTracking(tr);
        setStatus((s) => (b || tr ? 'ready' : s === 'ready' ? s : 'error'));
      } catch (err) {
        logError('diagnostics:sample-tracking', err);
        if (!isStopped()) setStatus((await isOffline()) ? 'offline' : 'error');
      }
    },
    [bookingId],
  );

  useEffect(() => {
    if (!bookingId) {
      setStatus('missing');
      return;
    }
    let stopped = false;
    const stop = () => stopped;
    void fetchTracking(stop);
    const interval = setInterval(() => void fetchTracking(stop), 15000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [bookingId, fetchTracking]);

  const serverSteps = Array.isArray(tracking?.steps) ? (tracking?.steps as unknown[]) : null;
  const raw: Array<{ key: string; title: string; time: string; done: boolean }> = serverSteps
    ? serverSteps.map((s, i) => {
        const r = (s && typeof s === 'object' ? s : {}) as Rec;
        return { key: String(i), title: str(r.title), time: str(r.time), done: Boolean(r.done) };
      })
    : DEFAULT_STEPS.map((key, i) => ({ key, title: k(key), time: '', done: i === 0 || (i === 1 && Boolean(tracking?.techName)) }));
  const firstTodo = raw.findIndex((s) => !s.done);
  const steps: TimelineStep[] = raw.map((s, i) => ({ key: s.key, title: s.title, time: s.time || undefined, state: s.done ? 'done' : i === firstTodo ? 'current' : 'todo' }));
  const st = diagStatus('lab', booking?.state);
  const eta = tracking?.eta !== undefined && tracking?.eta !== null && tracking?.eta !== '' ? Number(tracking.eta) : null;
  const techName = str(tracking?.techName);
  const phone = str(tracking?.techPhone);
  // The technician block belongs to a home collection: the booking says so, or the server has assigned a technician.
  const showTech = str(booking?.location_type) === 'home' || Boolean(techName);

  return (
    <ConsultScreen testID="diagnostics-sample-tracking" title={k('diag.track.sampleTitle')} onBack={goBackDiag}>
      <Gate status={status === 'missing' ? 'error' : status} onRetry={() => void fetchTracking(() => false)}>
        <Block gap={12}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {booking?.state ? <StatusPill label={k(st.key)} tone={st.tone} /> : null}
            {eta !== null && Number.isFinite(eta) ? <StatusTag label={k('diag.track.etaMinutes', { n: num(eta) })} tone="success" /> : null}
          </View>
          <ListCard>
            <View style={{ paddingHorizontal: 14 }}>
              <InfoRow label={k('diag.track.appointment')} value={fmt.dateTime(booking?.scheduled_at)} last />
            </View>
          </ListCard>
        </Block>
        {showTech ? (
          <>
            <Block gap={16}>
              <TrackHead label={k('diag.tech.eta')} value={eta !== null && Number.isFinite(eta) ? k('diag.track.minutes', { n: num(eta) }) : k('diag.tech.noEta')} />
              {techName ? (
                <PersonRow icon="user-circle" tone={CARE_TONE} title={techName} line={k('diag.tech.role')} actionIcon={phone ? 'headset' : undefined} actionLabel={k('diag.order.call')} onAction={() => void Linking.openURL(`tel:${phone}`)} />
              ) : null}
            </Block>
            <Block gap={8}>
              <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('diag.tech.tipsTitle')}</Text>
              <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('diag.tech.tips')}</Text>
            </Block>
          </>
        ) : null}
        <Notice tone="info" text={k('diag.track.prep')} />
        <Block gap={14}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('diag.track.stages')}</Text>
          <Timeline steps={steps} />
        </Block>
      </Gate>
    </ConsultScreen>
  );
}
