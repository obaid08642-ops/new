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

/** The catalogue language a test's preparation is written in, for the app language (tl is Filipino's catalogue code). */
const PREP_LANG: Record<string, string> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'tl', tl: 'tl' };
const FINAL_STATES = new Set(['REPORTED', 'CANCELLED', 'SAMPLE_REJECTED']);

/**
 * Tracking of a lab sample (board OrderTracking): the status, the time, the technician block (arrival, who, call) for a
 * home collection, each test's preparation from the catalogue and the booking's real status timeline (decision B8:
 * no fixed medical text). Also the old technician-tracking screen. Refreshes every 15 seconds.
 */
export default function SampleTrackingScreen() {
  const { t, c, k, num, flow, lang } = useScreenUi();
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

  // The steps are the states the booking really went through, named like the status pill, with their time.
  const timeline = (Array.isArray(tracking?.timeline) ? (tracking?.timeline as unknown[]) : []).flatMap((s, i) => {
    const r = (s && typeof s === 'object' ? s : {}) as Rec;
    return str(r.state) ? [{ key: `${i}-${str(r.state)}`, state: str(r.state), at: str(r.at) }] : [];
  });
  const lastIndex = timeline.length - 1;
  const steps: TimelineStep[] = timeline.map((s, i) => ({
    key: s.key,
    title: k(diagStatus('lab', s.state).key),
    time: s.at ? fmt.dateTime(s.at) : undefined,
    state: i < lastIndex || FINAL_STATES.has(s.state) ? 'done' : 'current',
  }));
  // Each test's own preparation, in the app language; none written -> the lab confirms it with the patient.
  const prepLang = PREP_LANG[lang] ?? 'en';
  const preparation = (Array.isArray(tracking?.preparation) ? (tracking?.preparation as unknown[]) : []).flatMap((p) => {
    const r = (p && typeof p === 'object' ? p : {}) as Rec;
    const texts = r.texts && typeof r.texts === 'object' ? (r.texts as Record<string, unknown>)[prepLang] : null;
    const lines = Array.isArray(texts) ? texts.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];
    const name = str(lang === 'ar' ? r.name_ar || r.name_en : r.name_en || r.name_ar);
    return lines.length ? [{ key: str(r.service_id) || name, name, lines }] : [];
  });
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
          </>
        ) : null}
        {preparation.length ? (
          <Block gap={8}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('diag.track.prepTitle')}</Text>
            {preparation.map((p) => (
              <View key={p.key} style={{ gap: 4 }}>
                {p.name ? <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{p.name}</Text> : null}
                {p.lines.map((line, i) => (
                  <Text key={i} style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{`• ${line}`}</Text>
                ))}
              </View>
            ))}
          </Block>
        ) : (
          <Notice tone="info" text={k('diag.track.prepAsk')} />
        )}
        {steps.length ? (
          <Block gap={14}>
            <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('diag.track.stages')}</Text>
            <Timeline steps={steps} />
          </Block>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
