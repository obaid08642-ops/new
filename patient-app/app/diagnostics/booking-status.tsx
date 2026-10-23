import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, type GateStatus } from '../../src/components/consult/ConsultKit';
import { AmountLine, Block, LAB_TONE, PersonRow, Timeline, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { fmtDate, fmtTime } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { getDraft } from '../../src/utils/orderingBooking';
import {
  clockParts, getApproval, getBooking, getReminders, getResults, getVisit, isNotFound, pressEmergency, secondsUntil, sendChoice, stageOf, statusErrorKey, stepsOf,
  type Approval, type BookingView, type Choice, type Reminder, type ResultValue, type Stage, type Visit,
} from '../../src/utils/orderingStatus';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';

const POLL_MS = 15000;
const MAX_POLLS = 240;
const DAY: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
const HM: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const STAGE_KEY: Record<Stage, string> = {
  cancelled: 'ordering.track.stCancelled', choice: 'ordering.track.stChoice', insurance: 'ordering.track.stInsurance', confirm: 'ordering.track.stConfirm',
  pay: 'ordering.track.stPay', active: 'ordering.track.stActive', results: 'ordering.track.stResults',
};

interface Loaded { booking: BookingView; approval: Approval | null }

/**
 * Ord08 + Ord09 + Ord10: one booking of an ordering group, from GET /ordering/bookings/:id. The screen follows the booking: the provider's
 * confirmation clock, the insurer's wait, the partial-approval choice, payment of the share, and the visit (staff, arrival code,
 * reminders, results, emergency). A split basket passes `group` (the sibling ids): each booking keeps its own status and refund.
 * Every amount is the server's; nothing is added up here.
 */
export default function BookingStatus() {
  const { theme, t, c, k, num, money, flow } = useScreenUi();
  const params = useLocalSearchParams<{ id?: string; group?: string }>();
  const ids = Array.from(new Set([String(params.id ?? ''), ...String(params.group ?? '').split(',')].filter(Boolean)));
  const idsKey = ids.join(',');
  const [selected, setSelected] = useState(ids[0] ?? '');
  const [data, setData] = useState<Record<string, Loaded>>({});
  const [status, setStatus] = useState<GateStatus>('loading');
  const [now, setNow] = useState(() => Date.now());
  const polls = useRef(0);
  const { items: cartItems } = useDiagnosticsCart();

  const load = useCallback(async (quiet: boolean) => {
    const list = idsKey.split(',').filter(Boolean);
    if (list.length === 0) return setStatus('missing');
    if (!quiet) setStatus('loading');
    try {
      const results = await Promise.allSettled(list.map(async (id): Promise<[string, Loaded]> => {
        const booking = await getBooking(id);
        const insured = booking.state === 'PENDING_INSURANCE' || booking.state === 'WAITING_COPAY' || booking.status === 'awaiting_approval' || booking.status === 'awaiting_patient_choice';
        const approval = insured ? await getApproval(id).catch(() => null) : null;
        return [id, { booking, approval }];
      }));
      const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      if (ok.length === 0) {
        const first = results[0];
        throw first && first.status === 'rejected' ? first.reason : new Error('invalid_booking');
      }
      setData(Object.fromEntries(ok));
      setStatus('ready');
    } catch (err) {
      logError('ordering:booking-status', err);
      if (quiet) return;
      setStatus(isNotFound(err) ? 'missing' : (await isOffline()) ? 'offline' : 'error');
    }
  }, [idsKey]);

  useEffect(() => {
    polls.current = 0;
    void load(false);
  }, [load]);

  const current = data[selected] ?? data[ids[0]];
  const stage = current ? stageOf(current.booking, current.approval, now) : null;
  const waiting = Object.values(data).some((d) => ['confirm', 'insurance', 'active'].includes(stageOf(d.booking, d.approval, now)));
  useEffect(() => {
    if (!waiting) return undefined;
    const poll = setInterval(() => {
      polls.current += 1;
      if (polls.current > MAX_POLLS) return clearInterval(poll);
      void load(true);
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [waiting, load]);

  const deadline = current?.booking.confirmDeadlineAt ?? null;
  const ticking = stage === 'confirm' && deadline !== null;
  useEffect(() => {
    if (!ticking || !deadline) return undefined;
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.parse(deadline) <= Date.now()) {
        clearInterval(tick);
        void load(true); // the server settles an expired confirmation when it is read
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [ticking, deadline, load]);

  const nameOf = (catalogId: string, index: number) => cartItems.find((i) => i.id === catalogId)?.name ?? k('ordering.track.itemN', { n: num(index + 1) });
  const when = (iso: string) => `${fmtDate(iso, DAY)} · ${fmtTime(iso, HM)}`;
  const shareLine = (label: string, amount: number | null, strong = false) => (amount === null ? null : <AmountLine label={label} amount={amount} strong={strong} />);

  return (
    <ConsultScreen testID="diagnostics-booking-status" title={k('ordering.track.title')} onBack={goBackDiag} onRefresh={() => void load(true)}>
      <Gate status={status} onRetry={() => void load(false)} missingTitle={k('ordering.err.bookingGone')}>
        {ids.length > 1 ? (
          <Section title={k('ordering.track.bookings')}>
            <Block gap={8}>
              {ids.map((id, n) => {
                const d = data[id];
                if (!d) return null;
                const s = stageOf(d.booking, d.approval, now);
                const on = id === (current?.booking.id ?? selected);
                return (
                  <Button key={id} theme={theme} size="md" variant={on ? 'primary' : 'outline'} onPress={() => setSelected(id)}
                    label={`${k('ordering.track.bookingN', { n: num(n + 1) })} · ${d.booking.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre')} · ${k(STAGE_KEY[s])}`} />
                );
              })}
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.track.separate')}</Text>
            </Block>
          </Section>
        ) : null}

        {current && stage ? (
          <Panel
            key={current.booking.id}
            booking={current.booking}
            approval={current.approval}
            stage={stage}
            now={now}
            nameOf={nameOf}
            when={when}
            shareLine={shareLine}
            onChanged={() => load(true)}
            money={money}
            c={c}
          />
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}

type UiColors = ReturnType<typeof useScreenUi>['c'];

function Panel({ booking, approval, stage, now, nameOf, when, shareLine, onChanged, money, c }: {
  booking: BookingView; approval: Approval | null; stage: Stage; now: number;
  nameOf: (id: string, i: number) => string; when: (iso: string) => string;
  shareLine: (label: string, amount: number | null, strong?: boolean) => React.ReactNode;
  onChanged: () => Promise<void>; money: (n: number) => string; c: UiColors;
}) {
  const { theme, t, k, num, flow } = useScreenUi();
  const small = { ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow };
  const meta = { ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow };
  const cancelledUnconfirmed = booking.status === 'cancelled_unconfirmed';
  const paid = booking.payment.status === 'paid' || booking.payment.status === 'partially_refunded';
  const [visit, setVisit] = useState<Visit | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [values, setValues] = useState<ResultValue[]>([]);
  const [problem, setProblem] = useState('');

  // ---- the visit side (Ord10): only once the booking is confirmed ----
  const visitStage = stage === 'active' || stage === 'results';
  useEffect(() => {
    if (!visitStage) return;
    let live = true;
    void getVisit(booking.id).then((v) => live && setVisit(v)).catch((e) => logError('ordering:visit', e));
    void getReminders(booking.id).then((r) => live && setReminders(r)).catch((e) => logError('ordering:reminders', e));
    return () => { live = false; };
  }, [visitStage, booking.id, booking.status]);
  useEffect(() => {
    if (stage !== 'results') return;
    let live = true;
    void getResults(booking.id).then((v) => live && setValues(v)).catch((e) => { if (!isNotFound(e)) logError('ordering:results', e); });
    return () => { live = false; };
  }, [stage, booking.id]);

  // ---- Ord09 choice ----
  const [picked, setPicked] = useState<Choice | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ choice: Choice; share: number | null } | null>(null);
  async function submitChoice(choice: Choice) {
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      const r = await sendChoice(booking.id, choice);
      setDone({ choice: r.choice, share: r.patientShareTotal });
      setConfirmCancel(false);
      await onChanged();
    } catch (err) {
      logError('ordering:partial-choice', err);
      setProblem(k(statusErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  // ---- paying the share (the same card flow as the confirm screen) ----
  const [paying, setPaying] = useState(false);
  const payKey = useRef<Record<string, string> | null>(null);
  async function pay() {
    if (paying) return;
    setPaying(true);
    setProblem('');
    try {
      const headers = (payKey.current ??= paymentIntentHeaders('lab', booking.id));
      const intent = await apiFetch<{ id?: string; checkout_url?: string; amount?: number; data?: { id?: string; checkout_url?: string; amount?: number } }>(`/payments/intent/lab/${booking.id}`, { method: 'POST', headers, body: JSON.stringify({}) });
      const txn = intent?.data || intent;
      if (!txn?.id) throw new Error('payment_intent_missing');
      router.replace({ pathname: '/payments/result', params: { moyasarId: String(txn.id), paymentUrl: txn.checkout_url || '', bookingId: booking.id, bookingKind: 'lab', amount: String(txn.amount ?? '') } } as unknown as Href);
    } catch (err) {
      logError('ordering:status-pay', err);
      setProblem(k('ordering.pay.failTitle'));
    } finally {
      setPaying(false);
    }
  }

  // ---- emergency (confirm step first) ----
  const [sos, setSos] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  async function callHelp() {
    if (sosBusy) return;
    setSosBusy(true);
    setProblem('');
    try {
      const number = await pressEmergency(booking.id);
      setSos(false);
      await Linking.openURL(`tel:${number}`);
    } catch (err) {
      logError('ordering:emergency', err);
      setProblem(k(statusErrorKey(err)));
    } finally {
      setSosBusy(false);
    }
  }

  const goOthers = () => router.push((getDraft() ? '/diagnostics/when' : '/diagnostics/service-home') as Href);

  return (
    <>
      <Block gap={6}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{booking.mode === 'home' ? k('ordering.match.homeVisit') : k('ordering.match.atCentre')}</Text>
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k(STAGE_KEY[stage])}</Text>
        {booking.items.map((i, n) => <AmountLine key={i.catalog_id} label={nameOf(i.catalog_id, n)} amount={i.price} />)}
        {booking.total !== null ? <AmountLine label={k('ordering.pay.lTotal')} amount={booking.total} strong /> : null}
        {booking.payment.status === 'paid' ? <Text style={meta}>{k('ordering.track.payPaid')}</Text> : booking.payment.status === 'pending' ? <Text style={meta}>{k('ordering.track.payPending')}</Text> : null}
      </Block>

      {problem ? <Notice tone="danger" text={problem} /> : null}

      {/* Ord08: the provider's confirmation clock */}
      {stage === 'confirm' && booking.confirmDeadlineAt ? (
        <Section title={k('ordering.wait.confirmTitle')}>
          <Block gap={8}>
            <Text style={small}>{k('ordering.wait.left')}</Text>
            <Clock seconds={secondsUntil(booking.confirmDeadlineAt, now)} />
            <Text style={meta}>{k('ordering.wait.refundNote')}</Text>
          </Block>
        </Section>
      ) : null}

      {/* Ord08: the insurer's wait */}
      {stage === 'insurance' ? (
        <Section title={k('ordering.wait.insTitle')}>
          <Block gap={8}>
            <Text style={small}>{k('ordering.wait.insBody')}</Text>
            {booking.mode === 'home' ? <Text style={small}>{k('ordering.wait.insHome')}</Text> : null}
            {approval?.estimate ? shareLine(k('ordering.wait.estShare'), approval.estimatedShareTotal) : null}
            {approval?.estimate ? <Text style={meta}>{k('ordering.wait.estNote')}</Text> : null}
          </Block>
        </Section>
      ) : null}

      {/* Ord08: cancelled by the system or the patient, the refund and the next provider */}
      {stage === 'cancelled' ? (
        <Section title={cancelledUnconfirmed ? k('ordering.wait.eTitle') : k('ordering.wait.cancelled')}>
          <Block gap={8}>
            {booking.payment.refundStatus ? <Notice tone="info" text={k('ordering.wait.eRefund')} /> : <Text style={small}>{paid ? k('ordering.wait.refundPending') : k('ordering.wait.noCharge')}</Text>}
            {booking.alternative ? (
              <>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.wait.eAlt')}</Text>
                <AmountLine label={when(booking.alternative.earliest_at)} amount={booking.alternative.total} strong />
              </>
            ) : null}
            <Button theme={theme} size="md" variant="outline" label={k('ordering.wait.eOther')} onPress={goOthers} />
          </Block>
        </Section>
      ) : null}

      {/* Ord09: partial approval */}
      {approval && (stage === 'choice' || (done && approval.status !== 'approved')) ? (
        <Section title={k('ordering.part.title')}>
          <Block gap={8}>
            <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{approval.status === 'rejected' ? k('ordering.part.headRejected') : k('ordering.part.head')}</Text>
            {stage === 'choice' ? <Text style={small}>{k('ordering.part.headSub')}</Text> : null}
            {approval.items.map((i, n) => (
              <View key={i.catalog_id} style={{ gap: 2 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{nameOf(i.catalog_id, n)} · {i.decision === 'approved' ? k('ordering.part.dApproved') : i.decision === 'rejected' ? k('ordering.part.dRejected') : k('ordering.part.dPending')}</Text>
                {i.insurerShare !== null ? <AmountLine label={k('ordering.part.colIns')} amount={i.insurerShare} /> : null}
                {i.patientShare !== null ? <AmountLine label={k('ordering.part.colYou')} amount={i.patientShare} /> : null}
              </View>
            ))}
            {approval.homeFee && approval.homeFee.amount > 0 ? <AmountLine label={approval.homeFee.covered ? `${k('ordering.part.fee')} · ${k('ordering.part.dApproved')}` : k('ordering.part.fee')} amount={approval.homeFee.amount} /> : null}
            {shareLine(k('ordering.part.finalShare'), approval.patientShareTotal, true)}
            {approval.validUntil ? <Text style={meta}>{k('ordering.part.expires', { d: when(approval.validUntil) })}</Text> : null}
            {approval.expiresBeforeVisit ? <Notice tone="warning" text={k('ordering.wait.warn')} actionLabel={approval.rebookEarlier ? k('ordering.wait.rebook') : undefined} onAction={approval.rebookEarlier ? goOthers : undefined} /> : null}
          </Block>
          {stage === 'choice' ? (
            <Block gap={8}>
              {approval.choices.map((ch) => (
                <Button key={ch} theme={theme} size="md" variant={picked === ch ? 'primary' : 'outline'} label={k(`ordering.part.o_${ch}`)} onPress={() => { setPicked(ch); setConfirmCancel(false); }} />
              ))}
              {picked ? <Text style={meta}>{k(`ordering.part.s_${picked}`)}</Text> : null}
              {picked && picked !== 'cancel_free' ? <Button theme={theme} size="lg" fullWidth loading={busy} label={busy ? k('ordering.part.applying') : k('ordering.part.confirm')} onPress={() => void submitChoice(picked)} /> : null}
              {picked === 'cancel_free' && !confirmCancel ? <Button theme={theme} size="lg" fullWidth variant="danger" label={k('ordering.part.o_cancel_free')} onPress={() => setConfirmCancel(true)} /> : null}
              {picked === 'cancel_free' && confirmCancel ? (
                <View accessibilityRole="alert" style={{ gap: 8 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.part.sheetTitle')}</Text>
                  <Text style={small}>{k('ordering.part.sheetBody')}</Text>
                  <Button theme={theme} size="lg" fullWidth variant="danger" loading={busy} label={busy ? k('ordering.part.applying') : k('ordering.part.confirmCancel')} onPress={() => void submitChoice('cancel_free')} />
                  <Button theme={theme} size="md" variant="outline" label={k('ordering.part.keep')} onPress={() => setConfirmCancel(false)} />
                </View>
              ) : null}
            </Block>
          ) : null}
        </Section>
      ) : null}
      {done ? <Notice tone="info" text={done.choice === 'cancel_free' ? k('ordering.part.doneCancel') : k('ordering.part.doneBody')} /> : null}

      {/* the share to pay once the insurer's answer is final */}
      {stage === 'pay' ? (
        <Section title={k('ordering.part.payTitle')}>
          <Block gap={8}>
            {approval ? shareLine(k('ordering.part.finalShare'), approval.patientShareTotal, true) : null}
            <Button theme={theme} size="lg" fullWidth loading={paying} label={approval?.patientShareTotal != null ? k('ordering.pay.btnPay', { a: money(approval.patientShareTotal) }) : k('ordering.part.payNow')} onPress={() => void pay()} />
          </Block>
        </Section>
      ) : null}

      {/* Ord10: tracking */}
      {(stage === 'active' || stage === 'results' || stage === 'pay') ? (
        <Section title={k('ordering.track.stepsTitle')}>
          <Block gap={4}>
            <Timeline steps={stepsOf(booking, approval).map((s, n, all) => ({ key: s.key, title: k(`ordering.track.s_${s.key}`), state: s.done ? 'done' : all.slice(0, n).every((p) => p.done) ? 'current' : 'todo' }))} />
          </Block>
        </Section>
      ) : null}

      {visit?.staff && booking.mode === 'home' && stage !== 'results' ? (
        <Section title={k('ordering.track.staffTitle')}>
          <Block gap={10}>
            {visit.staff.photo_url ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image accessibilityIgnoresInvertColors source={{ uri: visit.staff.photo_url }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{visit.staff.name}</Text>
                  {visit.staff.license ? <Text style={meta}>{k('ordering.track.licence', { n: visit.staff.license })}</Text> : null}
                </View>
              </View>
            ) : (
              <PersonRow icon="user" tone={LAB_TONE} title={visit.staff.name} line={visit.staff.license ? k('ordering.track.licence', { n: visit.staff.license }) : undefined} />
            )}
            {visit.arrivalCode ? (
              <View style={{ gap: 4 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.track.codeTitle')}</Text>
                <Text accessibilityLabel={visit.arrivalCode.split('').join(' ')} style={{ ...scale(t, 'h2', 'bold'), color: c.text.primary, letterSpacing: 8, textAlign: 'center', writingDirection: 'ltr' }}>{visit.arrivalCode}</Text>
                <Text style={meta}>{k('ordering.track.codeHint')}</Text>
              </View>
            ) : null}
          </Block>
        </Section>
      ) : null}

      {reminders.length > 0 && stage === 'active' ? (
        <Section title={k('ordering.track.remTitle')}>
          <Block gap={8}>
            {reminders.map((r) => (
              <View key={r.kind} style={{ gap: 2 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{when(r.at)}</Text>
                <Text style={small}>{k(`ordering.track.rem_${r.kind}`)}</Text>
              </View>
            ))}
          </Block>
        </Section>
      ) : null}

      {stage === 'results' ? (
        <Section title={k('ordering.track.resTitle')}>
          <Block gap={8}>
            {values.map((v) => (
              <View key={v.catalog_id} style={{ gap: 2 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{v.name} · {num(v.value)} {v.unit}</Text>
                {v.low !== null && v.high !== null ? <Text style={meta}>{k('ordering.track.range', { l: num(v.low), h: num(v.high) })} · {k(`ordering.track.flag_${v.flag}`)}</Text> : <Text style={meta}>{k(`ordering.track.flag_${v.flag}`)}</Text>}
              </View>
            ))}
            <Button theme={theme} size="md" label={k('ordering.res.discuss')} onPress={() => router.push({ pathname: '/diagnostics/discuss', params: { booking: booking.id } } as unknown as Href)} testID="booking-discuss" />
            <Button theme={theme} size="md" variant="outline" label={k('ordering.track.allResults')} onPress={() => router.push('/diagnostics/my-results' as Href)} />
          </Block>
        </Section>
      ) : null}

      {stage === 'active' ? (
        <Section>
          {sos ? (
            <Block gap={8}>
              <View accessibilityRole="alert" style={{ gap: 8 }}>
                <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('ordering.track.sosTitle')}</Text>
                <Text style={small}>{k('ordering.track.sosBody')}</Text>
              </View>
              <Button theme={theme} size="lg" fullWidth variant="danger" loading={sosBusy} label={k('ordering.track.sosBtn')} onPress={() => void callHelp()} />
              <Button theme={theme} size="md" variant="outline" label={k('ordering.track.sosCancel')} onPress={() => setSos(false)} />
            </Block>
          ) : (
            <Button theme={theme} size="md" variant="danger" label={k('ordering.track.sos')} onPress={() => setSos(true)} />
          )}
        </Section>
      ) : null}
    </>
  );
}

/** mm:ss (h:mm:ss beyond an hour) in the language's digits, always left-to-right. */
function Clock({ seconds }: { seconds: number }) {
  const { t, c, num } = useScreenUi();
  const p = clockParts(seconds);
  const two = (n: number) => num(n, { minimumIntegerDigits: 2, useGrouping: false });
  const text = p.h > 0 ? `${num(p.h)}:${two(p.m)}:${two(p.s)}` : `${two(p.m)}:${two(p.s)}`;
  return <Text accessibilityRole="timer" style={{ ...scale(t, 'h2', 'bold'), color: c.text.primary, textAlign: 'center', writingDirection: 'ltr' }}>{text}</Text>;
}
