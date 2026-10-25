import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, EmptyState, FIcon, Radio, Segmented } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section } from '../../src/components/consult/ConsultKit';
import { Block, LAB_TONE, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { fetchPublicList } from '../../src/utils/publicCache';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';
import { cancelInstant, clock, discussErrorKey, getInstant, openDraft, secondsLeft, startInstant, type Draft, type InstantMode, type InstantRequest } from '../../src/utils/orderingDiscuss';
import { useOrderingContext } from '../../src/utils/useOrderingContext';

interface Specialty { slug?: string; name_ar?: string; name_en?: string; count?: number }

/**
 * Ord11 "Discuss with a doctor" (M8 instant consultation) with the result attached: choose the specialty and the mode, start
 * (POST /ordering/bookings/:id/results/discuss then POST /consultations/instant), wait (GET /consultations/instant/:id every 3 s,
 * accepted-by, countdown from expires_at), cancel, and open the consultation when a doctor accepts. Nothing is charged before
 * a doctor accepts (the server sends payment_status); the fallback options of an expired request are the server's.
 */
export default function DiscussScreen() {
  const { theme, t, c, k, num, flow } = useScreenUi();
  const { booking } = useLocalSearchParams<{ booking?: string }>();
  const bookingId = booking ? String(booking) : '';
  const ctx = useOrderingContext('home');
  const members = ctx.profile?.members ?? [];

  const [specs, setSpecs] = useState<Specialty[]>([]);
  const [specStatus, setSpecStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [slug, setSlug] = useState('');
  const [mode, setMode] = useState<InstantMode>('video');
  const [memberId, setMemberId] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [req, setReq] = useState<InstantRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState('');
  const [now, setNow] = useState(Date.now());
  const reqId = useRef<string | null>(null);

  const loadSpecs = useCallback(async () => {
    setSpecStatus('loading');
    try {
      const res = await fetchPublicList<Specialty[] | { data?: Specialty[] }>('/care/specialties');
      const list = Array.isArray(res) ? res : res?.data;
      setSpecs((Array.isArray(list) ? list : []).filter((s) => typeof s?.slug === 'string' && s.slug !== ''));
      setSpecStatus('ready');
    } catch (e) {
      logError('ordering:discuss-specialties', e);
      setSpecStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, []);
  useEffect(() => { void loadSpecs(); }, [loadSpecs]);

  const broadcasting = req?.status === 'broadcasting';
  useEffect(() => {
    if (!broadcasting) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      const id = reqId.current;
      if (id) void getInstant(id).then(setReq).catch((e) => logError('ordering:discuss-poll', e));
    }, 3000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [broadcasting]);

  async function start() {
    if (busy || !slug || !bookingId) return;
    setBusy(true);
    setErrorKey('');
    try {
      const d = draft ?? (await openDraft(bookingId));
      setDraft(d);
      const r = await startInstant({ specialty: slug, mode, ...(memberId ? { family_member_id: memberId } : {}) });
      reqId.current = r.id;
      setReq(r);
      setNow(Date.now());
    } catch (e) {
      logError('ordering:discuss-start', e);
      setErrorKey(discussErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const id = reqId.current;
    if (busy || !id) return;
    setBusy(true);
    setErrorKey('');
    try {
      setReq(await cancelInstant(id));
    } catch (e) {
      logError('ordering:discuss-cancel', e);
      setErrorKey(discussErrorKey(e));
    } finally {
      setBusy(false);
    }
  }

  const title = k('ordering.res.discussTitle');
  const body = (text: string) => <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{text}</Text>;
  const problem = errorKey ? <Text accessibilityRole="alert" style={{ ...scale(t, 'small', 'bold'), color: c.status.danger.fg, ...flow }}>{k(errorKey)}</Text> : null;

  if (!bookingId) {
    return (
      <ConsultScreen testID="ordering-discuss" title={title} onBack={goBackDiag}>
        <EmptyState icon="file-text" tone={LAB_TONE} title={k('ordering.err.bookingGone')} theme={theme} />
      </ConsultScreen>
    );
  }

  let content: React.ReactNode;
  if (req?.status === 'broadcasting') {
    content = (
      <>
        <Block>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <FIcon icon="video-camera" tone={LAB_TONE} size={56} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{k('ordering.res.waitTitle')}</Text>
            <Text accessibilityLiveRegion="polite" accessibilityLabel={k('ordering.res.waitLeft', { t: clock(secondsLeft(req, now)) })} style={{ ...scale(t, 'h2'), color: c.text.primary }}>{clock(secondsLeft(req, now))}</Text>
            {body(k('ordering.res.waitBody'))}
            {req.doctorsNotified !== null ? body(k('ordering.res.notified', { n: num(req.doctorsNotified) })) : null}
            {req.paymentStatus === 'not_charged' ? body(k('ordering.res.notCharged')) : null}
          </View>
        </Block>
        {problem}
        <Button theme={theme} variant="outline" size="lg" fullWidth label={k('ordering.res.cancel')} loading={busy} onPress={() => void cancel()} testID="ordering-discuss-cancel" />
      </>
    );
  } else if (req?.status === 'accepted') {
    content = (
      <>
        <Block>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <FIcon icon="check-circle" tone="mint" size={56} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{k('ordering.res.acceptedTitle')}</Text>
            {body(k('ordering.res.acceptedBody'))}
          </View>
        </Block>
        {req.appointmentId ? (
          <Button theme={theme} size="lg" fullWidth label={k('ordering.res.openRoom')} onPress={() => router.replace({ pathname: '/consultations/appointment-detail', params: { appointmentId: req.appointmentId as string } } as unknown as Href)} testID="ordering-discuss-open" />
        ) : null}
      </>
    );
  } else if (req?.status === 'expired' || req?.status === 'cancelled') {
    const expired = req.status === 'expired';
    content = (
      <>
        <Block>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <FIcon icon="warning" tone={LAB_TONE} size={56} theme={theme} />
            <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{expired ? k('ordering.res.expiredTitle') : k('ordering.res.cancelledTitle')}</Text>
            {req.paymentStatus === 'not_charged' ? body(k('ordering.res.notCharged')) : null}
          </View>
        </Block>
        {expired && req.fallback?.options.includes('earliest_slot') ? (
          <Button theme={theme} size="lg" fullWidth label={k('ordering.res.bookSlot')} onPress={() => router.push('/consultations/specialty-select' as Href)} testID="ordering-discuss-slot" />
        ) : null}
        <Button theme={theme} size="lg" fullWidth variant="outline" label={k('ordering.res.tryAgain')} onPress={() => { setReq(null); reqId.current = null; }} testID="ordering-discuss-again" />
      </>
    );
  } else {
    content = (
      <>
        <Block>
          {body(k('ordering.res.discussBody'))}
          {draft ? body(k('ordering.res.attachedOk')) : null}
        </Block>
        <Section title={k('ordering.res.secSpecialty')}>
          <Gate status={specStatus} onRetry={() => void loadSpecs()} errorTitle={k('ordering.res.errGeneric')}>
            {specs.length === 0 ? (
              <EmptyState icon="stethoscope" tone={LAB_TONE} title={k('consult.spec.empty')} theme={theme} />
            ) : (
              <View>
                {specs.map((s, i) => (
                  <Radio key={s.slug} theme={theme} direction={undefined} label={pickLocalized(s.name_ar, s.name_en) || String(s.slug)} selected={slug === s.slug} onChange={() => setSlug(String(s.slug))} divider={i < specs.length - 1} />
                ))}
              </View>
            )}
          </Gate>
        </Section>
        <Segmented theme={theme} label={k('ordering.res.secMode')} value={mode} onChange={(v) => setMode(v === 'audio' ? 'audio' : 'video')} options={[{ value: 'video', label: k('ordering.res.modeVideo') }, { value: 'audio', label: k('ordering.res.modeAudio') }]} />
        {members.length > 0 ? (
          <Segmented theme={theme} label={k('ordering.ctx.lblWho')} value={memberId} onChange={setMemberId} options={[{ value: '', label: k('ordering.ctx.valMe') }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
        ) : null}
        {body(k('ordering.res.notChargedFirst'))}
        {problem}
        <Button theme={theme} size="lg" fullWidth label={k('ordering.res.start')} loading={busy} disabled={!slug} onPress={() => void start()} testID="ordering-discuss-start" />
        <Button theme={theme} size="lg" fullWidth variant="outline" label={k('ordering.res.later')} onPress={goBackDiag} testID="ordering-discuss-later" />
      </>
    );
  }

  return (
    <ConsultScreen testID="ordering-discuss" title={title} onBack={goBackDiag}>
      {content}
    </ConsultScreen>
  );
}
