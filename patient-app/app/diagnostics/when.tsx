import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Chip, EmptyState, Segmented } from '../../../packages/ui-native/src';
import { ConsultScreen, Section } from '../../src/components/consult/ConsultKit';
import { Block, LAB_TONE, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { QuoteFailure, QuoteLoading, TimeTile, WhenCard, useOrderDates } from '../../src/components/ordering/OrderingKit';
import { Notice } from '../../src/components/pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { providerName, type OrderingMode } from '../../src/utils/ordering';
import {
  ASAP_MAX_POLLS, ASAP_POLL_MS, asapAllowed, bookingErrorKey, cancelAsap, getAsap, getDraft, groupsMissingTime, nextDays, requestWindows, setTime, startAsap,
  windowsByDay, type Asap, type OrderingDraft, type TimePick, type WindowsAnswer,
} from '../../src/utils/orderingBooking';

const WIN_OPTS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const DAY_OPTS: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

/**
 * Ord06: the time of each booking. At home: the 2-hour windows of 3 days (GET /ordering/windows) or "as soon as possible" (POST
 * /ordering/asap, then GET /ordering/asap/:id every 3 s, bounded, with cancel). At the centre: the day's slots or walk-in. One tab per
 * booking of a split basket. The quote, provider and times live in the draft the compare screen started.
 */
export default function DiagnosticsWhen() {
  const { theme, t, c, k, num, flow, lang } = useScreenUi();
  const { fmtDate, fmtTime } = useOrderDates();
  const range = (s: string, e: string) => `${fmtTime(s, WIN_OPTS)} – ${fmtTime(e, WIN_OPTS)}`;
  const [draft, setDraft] = useState<OrderingDraft | null>(() => getDraft());
  const [mode, setMode] = useState<OrderingMode>(() => getDraft()?.quote.groups[0]?.mode ?? 'home');
  const group = draft?.quote.groups.find((g) => g.mode === mode) ?? draft?.quote.groups[0];
  const pick = group && draft ? draft.picks[group.mode] : undefined;
  const time = group && draft ? draft.times[group.mode] : undefined;

  // ---- the windows / slots of the tab's provider ----
  const [answer, setAnswer] = useState<WindowsAnswer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'offline'>('loading');
  const [errorKey, setErrorKey] = useState('ordering.err.generic');
  const [day, setDay] = useState<string | null>(null);
  const providerId = pick?.row.provider_id;
  const groupMode = group?.mode;
  const days = useMemo(() => nextDays(new Date(), 3), []);

  const load = useCallback(async () => {
    if (!providerId || !groupMode) return;
    setStatus('loading');
    try {
      setAnswer(await requestWindows(providerId, groupMode, groupMode === 'facility' ? day ?? days[0].iso : undefined));
      setStatus('ready');
    } catch (err) {
      logError('ordering:windows', err);
      setErrorKey(bookingErrorKey(err));
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [providerId, groupMode, day, days]);
  useEffect(() => {
    void load();
  }, [load]);

  const choose = (m: OrderingMode, pickTime: TimePick | undefined) => setDraft(setTime(m, pickTime));

  // ---- ASAP ----
  const [asap, setAsap] = useState<Asap | null>(null);
  const [asapBusy, setAsapBusy] = useState(false);
  const [asapError, setAsapError] = useState('');
  const [left, setLeft] = useState(0);
  const polls = useRef(0);
  const busy = useRef(false);
  const open = asap?.status === 'broadcasting';
  const asapId = asap?.id;

  useEffect(() => {
    if (!open || !asapId) return undefined;
    let live = true;
    polls.current = 0;
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = setInterval(async () => {
      if (!live || busy.current) return;
      polls.current += 1;
      if (polls.current > ASAP_MAX_POLLS) {
        clearInterval(poll);
        return;
      }
      busy.current = true;
      try {
        const next = await getAsap(asapId);
        if (!live) return;
        setAsap(next);
        setLeft(next.seconds_left);
      } catch (err) {
        logError('ordering:asap-poll', err);
      } finally {
        busy.current = false;
      }
    }, ASAP_POLL_MS);
    return () => {
      live = false;
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [open, asapId]);

  useEffect(() => {
    if (asap?.status === 'accepted' && asap.booking_id) {
      router.replace({ pathname: '/diagnostics/booking-status', params: { id: asap.booking_id } } as unknown as Href);
    }
  }, [asap]);

  async function beginAsap() {
    if (!draft || !group || asapBusy || open) return;
    setAsapBusy(true);
    setAsapError('');
    try {
      const started = await startAsap({ service_kind: draft.kind, items: group.items.map((i) => i.catalog_id), lat: draft.lat, lng: draft.lng, payer: draft.payer });
      setAsap(started);
      setLeft(started.seconds_left);
    } catch (err) {
      logError('ordering:asap', err);
      setAsapError(bookingErrorKey(err));
    } finally {
      setAsapBusy(false);
    }
  }

  async function stopAsap() {
    if (!asap || asapBusy) return;
    setAsapBusy(true);
    try {
      setAsap(await cancelAsap(asap.id));
    } catch (err) {
      logError('ordering:asap-cancel', err);
      setAsapError(bookingErrorKey(err));
    } finally {
      setAsapBusy(false);
    }
  }

  if (!draft || !group) {
    return (
      <ConsultScreen testID="diagnostics-when" title={k('ordering.when.title')} onBack={goBackDiag}>
        <EmptyState icon="test-tube" tone={LAB_TONE} title={k('ordering.when.noDraft')} actionLabel={k('ordering.common.back')} onAction={goBackDiag} theme={theme} />
      </ConsultScreen>
    );
  }

  const missing = groupsMissingTime(draft);
  const home = group.mode === 'home';
  const mmss = `${num(Math.floor(left / 60))}:${String(left % 60).padStart(2, '0')}`;
  const timeText = (m: OrderingMode): string | null => {
    const x = draft.times[m];
    if (!x) return null;
    if (x.type === 'walk_in') return k('ordering.when.modeWalk');
    return `${fmtDate(x.start, DAY_OPTS)} · ${range(x.start, x.end)}`;
  };

  const footer = (
    <Button
      theme={theme}
      size="lg"
      fullWidth
      label={missing.length > 0 && missing[0] !== mode && draft.quote.groups.length > 1 ? k('ordering.when.nextBooking') : k('ordering.when.toPay')}
      disabled={open || (missing.length > 0 && missing[0] === mode)}
      testID="diag-when-continue"
      onPress={() => (missing.length > 0 ? setMode(missing[0]) : router.push('/diagnostics/confirm' as Href))}
    />
  );

  const byDay = answer?.kind === 'home' ? windowsByDay(answer.windows) : [];
  const dayWindows = byDay.find((d) => d.day === day) ?? byDay[0];

  return (
    <ConsultScreen testID="diagnostics-when" title={k('ordering.when.title')} onBack={goBackDiag} footer={footer} onRefresh={() => void load()}>
      {draft.quote.groups.length > 1 ? (
        <Segmented
          theme={theme}
          label={k('ordering.when.title')}
          value={group.mode}
          onChange={(v) => setMode(v === 'facility' ? 'facility' : 'home')}
          options={draft.quote.groups.map((g) => ({ value: g.mode, label: g.mode === 'home' ? k('ordering.when.tabHome', { n: num(g.items.length) }) : k('ordering.when.tabCentreN', { n: num(g.items.length) }) }))}
        />
      ) : null}

      {pick ? (
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{[providerName(pick.row, lang), home ? draft.placeLine : null].filter(Boolean).join(' · ')}</Text>
      ) : null}

      {home && draft.payer === 'insurance' ? <Notice tone="info" text={k('ordering.when.insHome')} /> : null}

      {status === 'loading' ? <QuoteLoading label={k('ordering.when.loading')} /> : null}
      {status === 'error' || status === 'offline' ? <QuoteFailure offline={status === 'offline'} errorKey={errorKey} onRetry={() => void load()} /> : null}

      {status === 'ready' && answer?.kind === 'home' && home ? (
        <>
          {answer.asapOffered && asapAllowed(draft) && !open && asap?.status !== 'expired' ? (
            <Section title={k('ordering.when.asapTitle')}>
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.asapSub')}</Text>
              <Button theme={theme} size="md" variant="outline" label={k('ordering.when.asapBtn')} loading={asapBusy} onPress={() => void beginAsap()} />
              {asapError ? <Notice tone="danger" text={k(asapError)} /> : null}
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.asapNoOpt')}</Text>
            </Section>
          ) : null}

          {open && asap ? (
            <Section title={k('ordering.when.srchTitle')}>
              <Block gap={8}>
                <View accessibilityLiveRegion="polite">
                  <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>
                    {asap.radius_km !== null ? k('ordering.when.stageLine', { n: num(asap.stage), d: num(asap.radius_km) }) : k('ordering.when.stageOnly', { n: num(asap.stage) })}
                  </Text>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.left')} {mmss}</Text>
                </View>
                <Button theme={theme} size="md" variant="outline" label={k('ordering.when.srchCancel')} loading={asapBusy} onPress={() => void stopAsap()} />
                {asapError ? <Notice tone="danger" text={k(asapError)} /> : null}
              </Block>
            </Section>
          ) : null}

          {asap?.status === 'expired' ? (
            <Section title={k('ordering.when.asapNone')}>
              {asap.fallback && asap.fallback.provider_id === pick?.row.provider_id ? (
                <>
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.srchOr')}: {fmtDate(asap.fallback.start, DAY_OPTS)} · {range(asap.fallback.start, asap.fallback.end)}</Text>
                  <Button theme={theme} size="md" label={k('ordering.when.takeEarliest')} onPress={() => { const f = asap.fallback; if (f) choose('home', { type: 'window', start: f.start, end: f.end }); setAsap(null); }} />
                </>
              ) : (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.pickBelow')}</Text>
              )}
            </Section>
          ) : null}
          {asap?.status === 'cancelled' ? <Notice tone="info" text={k('ordering.when.asapCancelled')} /> : null}

          <WhenCard icon="house" tone="mint" title={k('ordering.when.homeTitle')} sub={k('ordering.when.homeSub')}>
            {byDay.length === 0 ? (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.noWin')}</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {byDay.map((d) => (
                    <TimeTile key={d.day} kind="day" label={fmtDate(d.start, DAY_OPTS)} selected={(dayWindows?.day ?? '') === d.day} onPress={() => setDay(d.day)} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(dayWindows?.windows ?? []).map((w) => (
                    <TimeTile
                      key={w.start}
                      kind="window"
                      label={range(w.start, w.end)}
                      selected={time?.type === 'window' && time.start === w.start}
                      onPress={() => choose('home', { type: 'window', start: w.start, end: w.end })}
                    />
                  ))}
                </View>
              </>
            )}
          </WhenCard>
        </>
      ) : null}

      {status === 'ready' && answer?.kind === 'walk_in' && !home ? (
        <Section title={k('ordering.when.walkTitle')}>
          <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.walkSub')}</Text>
          <Chip theme={theme} label={k('ordering.when.modeWalk')} selected={time?.type === 'walk_in'} onPress={() => choose('facility', { type: 'walk_in' })} />
        </Section>
      ) : null}

      {status === 'ready' && answer?.kind === 'slots' && !home ? (
        <WhenCard icon="hospital" tone="violet" title={k('ordering.when.centreTitle')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {days.map((d) => (
              <TimeTile key={d.iso} kind="day" label={fmtDate(d.at, DAY_OPTS)} selected={(day ?? days[0].iso) === d.iso} onPress={() => setDay(d.iso)} />
            ))}
          </View>
          {answer.slots.length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.noSlots')}</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {answer.slots.map((s) => (
                <TimeTile key={s.id} kind="window" label={fmtTime(s.start, WIN_OPTS)} selected={time?.type === 'slot' && time.id === s.id} onPress={() => choose('facility', { type: 'slot', id: s.id, start: s.start, end: s.end })} />
              ))}
            </View>
          )}
          {draft.payer === 'insurance' ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('ordering.when.slotsNote')}</Text> : null}
        </WhenCard>
      ) : null}

      <Section title={k('ordering.when.sumTitle')}>
        <Block gap={6}>
          {draft.quote.groups.map((g) => {
            const p = draft.picks[g.mode];
            return (
              <View key={g.mode} style={{ gap: 2 }}>
                <Text style={{ ...scale(t, 'meta', 'bold'), color: c.text.primary, ...flow }}>{g.mode === 'home' ? k('ordering.when.tabHome', { n: num(g.items.length) }) : k('ordering.when.tabCentreN', { n: num(g.items.length) })}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{p ? providerName(p.row, lang) : ''}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{timeText(g.mode) ?? k('ordering.when.sumNone')}</Text>
              </View>
            );
          })}
        </Block>
      </Section>
    </ConsultScreen>
  );
}
