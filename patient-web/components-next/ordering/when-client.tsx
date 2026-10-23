"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { parseChoice, SELECTION_KEY, type ChosenGroup, type ProviderChoice } from "@/lib/ordering/basket";
import { cancelAsap, OrderingApiError, readAsap, requestWindows, startAsap } from "@/lib/ordering/client";
import { contextQuery, type Point } from "@/lib/ordering/context";
import { pickName } from "@/lib/ordering/format";
import { orderingErrorKey, type OrderMode, type Payer, type ServiceKind } from "@/lib/ordering/quote";
import { asapOpen, clock, dayKey, dayText, groupByDay, hasChoices, nextDays, parseSchedule, rangeText, SCHEDULE_KEY, slotText, whenSummary, type Asap, type Schedule } from "@/lib/ordering/schedule";
import type { WindowsAnswer } from "@/lib/ordering/windows";
import { QuoteError, QuoteLoading } from "./quote-parts";
import styles from "./ordering.module.css";

type Props = { locale: string; kind: ServiceKind; place: OrderMode; pay: Payer; point: Point | null };
type Load = { status: "loading" } | { status: "ready"; answer: WindowsAnswer } | { status: "error"; errorKey: string };

const POLL_MS = 5000; // the backend moves a stage on read; 5 s keeps the load low and the clock honest (the clock itself ticks locally from seconds_left)
const keyOf = (e: unknown) => (e instanceof OrderingApiError ? (e.code === "network" ? "errNetwork" : orderingErrorKey(e.code)) : "errGeneric");

function readStore<T>(key: string, parse: (raw: string | null) => T): T {
  try { return parse(window.sessionStorage.getItem(key)); } catch { return parse(null); }
}

/** Ord06: the time per booking. Home: 2-hour windows for 3 days + ASAP (3/5/8 km stages). Centre: slots of a day, or walk-in. All from GET /ordering/windows and /ordering/asap. */
export function WhenClient({ locale, kind, place, pay, point }: Props) {
  const t = useTranslations("OrderingFlow");
  const router = useRouter();
  const [choice, setChoice] = useState<ProviderChoice | null | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [tab, setTab] = useState<OrderMode>("home");

  useEffect(() => {
    const c = readStore(SELECTION_KEY, parseChoice);
    setChoice(c);
    if (c) {
      const saved = readStore(SCHEDULE_KEY, parseSchedule);
      setSchedule(saved && saved.quoteId === c.quoteId ? saved : { quoteId: c.quoteId });
      setTab(c.home ? "home" : "facility");
    }
  }, []);

  const update = useCallback((next: (s: Schedule) => Schedule) => {
    setSchedule((cur) => {
      if (!cur) return cur;
      const s = next(cur);
      try { window.sessionStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); } catch { /* the choice then lives on this page only */ }
      return s;
    });
  }, []);

  const providersHref = `/${locale}/labs/providers${contextQuery({ kind, place, pay })}`;
  if (choice === undefined) return <QuoteLoading label={t("whenLoading")} />;
  if (!choice || !schedule || (!choice.home && !choice.facility)) {
    return <EmptyState icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={t("whenNoChoiceTitle")} body={t("whenNoChoiceSub")} actionLabel={t("whenBackProviders")} onAction={() => router.push(providersHref)} />;
  }

  const modes = (["home", "facility"] as const).filter((m) => choice[m]);
  const active: OrderMode = modes.includes(tab) ? tab : modes[0];
  const ready = modes.every((m) => !!schedule[m]);
  const itemIds = modes.flatMap((m) => choice.groups?.[m]?.itemIds ?? []);
  const confirmHref = `/${locale}/labs/confirm${contextQuery({ kind, place, pay })}${itemIds.length ? `${contextQuery({ kind, place, pay }) ? "&" : "?"}ids=${encodeURIComponent(itemIds.slice(0, 12).join(","))}` : ""}`;

  return (
    <div className={styles.stack}>
      {modes.length > 1 ? (
        <div className={styles.tabs} role="group" aria-label={t("whenTabsAria")}>
          {modes.map((m) => (
            <button key={m} type="button" className={styles.chip} aria-pressed={active === m} onClick={() => setTab(m)}>
              {m === "home" ? t("whenTabHome", { n: choice.groups?.[m]?.itemIds.length ?? 0 }) : t("whenTabCentre", { n: choice.groups?.[m]?.itemIds.length ?? 0 })}
            </button>
          ))}
        </div>
      ) : null}

      {active === "home" && choice.home ? (
        <HomePicker locale={locale} kind={kind} pay={pay} point={point} providerId={choice.home} group={choice.groups?.home} schedule={schedule} update={update} onNext={modes.length > 1 && !schedule.facility ? () => setTab("facility") : undefined} />
      ) : null}
      {active === "facility" && choice.facility ? <CentrePicker locale={locale} providerId={choice.facility} schedule={schedule} update={update} /> : null}

      <section className={styles.card} aria-label={t("whenSumTitle")}>
        <h2 className={styles.title}>{t("whenSumTitle")}</h2>
        {modes.map((m) => {
          const g = choice.groups?.[m];
          const time = schedule[m];
          return (
            <div key={m} className={styles.line}>
              <span>{m === "home" ? t("homeVisit") : t("atCentre")}{g ? ` · ${pickName(locale, g.nameAr, g.nameEn) ?? ""}` : ""}</span>
              <span>{time?.type === "walk_in" ? t("whenModeWalk") : whenSummary(locale, time) ?? t("whenSumNone")}</span>
            </div>
          );
        })}
        {pay === "insurance" && modes.includes("home") ? <p className={styles.sub}>{t("whenInsHome")}</p> : null}
        <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={!ready} onClick={() => router.push(confirmHref)}>{t("whenToPay")}</button>
      </section>
    </div>
  );
}

function useWindows(providerId: string, mode: OrderMode, date?: string) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoad({ status: "loading" });
    requestWindows({ providerId, mode, date })
      .then((answer) => alive && setLoad({ status: "ready", answer }))
      .catch((e: unknown) => alive && setLoad({ status: "error", errorKey: keyOf(e) }));
    return () => { alive = false; };
  }, [providerId, mode, date, tick]);
  return { load, reload: useCallback(() => setTick((n) => n + 1), []) };
}

type Update = (next: (s: Schedule) => Schedule) => void;

function HomePicker({ locale, kind, pay, point, providerId, group, schedule, update, onNext }: { locale: string; kind: ServiceKind; pay: Payer; point: Point | null; providerId: string; group?: ChosenGroup; schedule: Schedule; update: Update; onNext?: () => void }) {
  const t = useTranslations("OrderingFlow");
  const { load, reload } = useWindows(providerId, "home");
  const [day, setDay] = useState<string | null>(null);
  const days = useMemo(() => (load.status === "ready" && load.answer.kind === "home" ? groupByDay(load.answer.windows) : []), [load]);
  const current = day && days.some((d) => d.day === day) ? day : days[0]?.day ?? null;

  if (load.status === "loading") return <QuoteLoading label={t("whenLoading")} />;
  if (load.status === "error") return <QuoteError errorKey={load.errorKey} onRetry={reload} titleKey="whenErrTitle" />;
  const answer = load.answer;
  if (answer.kind !== "home" || !hasChoices(answer)) return <div className={styles.card}><p className={styles.title}>{t("whenNoWin")}</p><button type="button" className={styles.linkBtn} onClick={reload}>{t("retry")}</button></div>;
  const todayKey = dayKey(new Date().toISOString());
  const picked = schedule.home;

  return (
    <>
      <section className={styles.card} aria-label={t("whenHomeTitle")}>
        <div>
          <h2 className={styles.title}>{t("whenHomeTitle")}</h2>
          <p className={styles.sub}>{t("whenHomeSub")}</p>
        </div>
        <div className={styles.chips} role="group" aria-label={t("whenDayAria")}>
          {days.map((d) => (
            <button key={d.day} type="button" className={styles.chip} aria-pressed={current === d.day} onClick={() => setDay(d.day)}>
              {d.day === todayKey ? t("whenToday") : dayText(locale, d.windows[0].start)}
            </button>
          ))}
        </div>
        <div className={styles.grid} role="group" aria-label={t("whenWindowAria")}>
          {(days.find((d) => d.day === current)?.windows ?? []).map((w) => (
            <button key={w.start} type="button" className={styles.chip} aria-pressed={picked?.start === w.start} onClick={() => { update((s) => ({ ...s, home: { type: "window", start: w.start, end: w.end } })); onNext?.(); }}>
              <bdi>{rangeText(locale, w.start, w.end)}</bdi>
            </button>
          ))}
        </div>
      </section>
      {answer.asap ? <AsapCard locale={locale} kind={kind} pay={pay} point={point} group={group} schedule={schedule} update={update} /> : null}
    </>
  );
}

function AsapCard({ locale, kind, pay, point, group, schedule, update }: { locale: string; kind: ServiceKind; pay: Payer; point: Point | null; group?: ChosenGroup; schedule: Schedule; update: Update }) {
  const t = useTranslations("OrderingFlow");
  const [asap, setAsap] = useState<Asap | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const busyRef = useRef(false);
  const asapId = schedule.asapId;

  // Resume a broadcast that is still open after a reload (the backend allows one open ASAP per patient).
  useEffect(() => {
    if (!asapId || asap) return;
    readAsap(asapId).then(setAsap).catch(() => update((s) => ({ ...s, asapId: undefined })));
  }, [asapId, asap, update]);

  // Poll a bounded way while the broadcast is open: every POLL_MS, stopped as soon as it is accepted, expired or cancelled.
  useEffect(() => {
    if (!asap || !asapOpen(asap)) return;
    const ctl = new AbortController();
    const timer = window.setInterval(() => {
      readAsap(asap.id, ctl.signal).then((a) => { if (!ctl.signal.aborted) setAsap(a); }).catch(() => { /* a failed poll keeps the last answer; the next one retries */ });
    }, POLL_MS);
    return () => { ctl.abort(); window.clearInterval(timer); };
  }, [asap]);

  // The visible clock counts down the server's `seconds_left` between polls.
  useEffect(() => {
    if (!asap) return;
    setLeft(asap.secondsLeft);
    if (!asapOpen(asap)) return;
    const timer = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [asap]);

  const ids = group?.itemIds ?? [];
  const begin = async () => {
    if (busyRef.current || !point || ids.length === 0) return;
    busyRef.current = true; setBusy(true); setErrorKey(null);
    try {
      const a = await startAsap({ service_kind: kind, items: ids, lat: point.lat, lng: point.lng, payer: pay });
      setAsap(a);
      update((s) => ({ ...s, asapId: a.id }));
    } catch (e) {
      setErrorKey(keyOf(e));
    } finally { busyRef.current = false; setBusy(false); }
  };
  const cancel = async () => {
    if (!asap || busyRef.current) return;
    busyRef.current = true; setBusy(true); setErrorKey(null);
    try { setAsap(await cancelAsap(asap.id)); update((s) => ({ ...s, asapId: undefined })); }
    catch (e) { setErrorKey(keyOf(e)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const takeFallback = () => {
    const w = asap?.fallback;
    if (!w) return;
    update((s) => ({ ...s, home: { type: "window", start: w.start, end: w.end }, asapId: undefined }));
    setAsap(null);
  };

  const stageState = (n: number) => (!asap ? "next" : n < asap.stage ? "done" : n === asap.stage ? "now" : "next");
  const stageRadius = (n: number) => (asap && n === asap.stage ? asap.radiusKm : null);

  return (
    <section className={styles.card} aria-label={t("whenAsapTitle")} aria-live="polite">
      <div>
        <h2 className={styles.title}>{t("whenAsapTitle")}</h2>
        <p className={styles.sub}>{t("whenAsapSub")}</p>
      </div>
      {!asap || asap.status === "cancelled" ? (
        <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={busy || !point || ids.length === 0} onClick={begin}>{t("whenAsapBtn")}</button>
      ) : null}
      {asap && asapOpen(asap) ? (
        <>
          <p className={styles.title}>{t("whenSrchTitle")}</p>
          <p className={styles.sub}>{t("whenLeft")}</p>
          <p className={styles.clock} role="timer"><bdi>{clock(locale, left)}</bdi></p>
          <div role="list">
            {[1, 2, 3].map((n) => (
              <div key={n} role="listitem" className={styles.stage} data-state={stageState(n)} aria-current={stageState(n) === "now" ? "step" : undefined}>
                <span>{stageRadius(n) !== null ? t("whenStage", { n, km: new Intl.NumberFormat(locale).format(stageRadius(n) as number) }) : t("whenStageN", { n })}</span>
                <span>{stageState(n) === "done" ? t("whenStDone") : stageState(n) === "next" ? t("whenStWait") : ""}</span>
              </div>
            ))}
          </div>
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={cancel}>{t("whenSrchCancel")}</button>
        </>
      ) : null}
      {asap?.status === "accepted" ? (
        <div className={styles.note} role="status">
          <strong>{t("whenAsapAccepted")}</strong>
          <p className={styles.sub}>{t("whenAsapAcceptedSub")}</p>
          <Link href={asap.bookingId ? `/${locale}/labs/bookings/${encodeURIComponent(asap.bookingId)}` : `/${locale}/diagnostics/bookings`} className={styles.linkBtn}>{asap.bookingId ? t("trackOpen") : t("whenOpenBookings")}</Link>
        </div>
      ) : null}
      {asap?.status === "expired" ? (
        <div className={styles.note} role="status">
          <strong>{t("whenAsapExpired")}</strong>
          {asap.fallback ? (
            <>
              <p className={styles.sub}>{t("whenAsapFallback", { w: `${dayText(locale, asap.fallback.start)} · ${rangeText(locale, asap.fallback.start, asap.fallback.end)}` })}</p>
              <button type="button" className={`${styles.linkBtn} ${styles.cta}`} onClick={takeFallback}>{t("whenSrchOr")}</button>
            </>
          ) : <p className={styles.sub}>{t("whenAsapNoFallback")}</p>}
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={begin}>{t("whenAsapAgain")}</button>
        </div>
      ) : null}
      {errorKey ? <p className={styles.errorBox} role="alert">{t(errorKey)}</p> : null}
    </section>
  );
}

function CentrePicker({ locale, providerId, schedule, update }: { locale: string; providerId: string; schedule: Schedule; update: Update }) {
  const t = useTranslations("OrderingFlow");
  const days = useMemo(() => nextDays(new Date(), 3), []);
  const [day, setDay] = useState(days[0]);
  const { load, reload } = useWindows(providerId, "facility", day);
  const picked = schedule.facility;

  if (load.status === "loading") return <QuoteLoading label={t("whenLoading")} />;
  if (load.status === "error") return <QuoteError errorKey={load.errorKey} onRetry={reload} titleKey="whenErrTitle" />;
  const a = load.answer;
  if (a.kind === "walk_in") {
    return (
      <section className={styles.card} aria-label={t("whenWalkTitle")}>
        <h2 className={styles.title}>{t("whenWalkTitle")}</h2>
        <p className={styles.sub}>{t("whenWalkSub")}</p>
        <button type="button" className={`${styles.linkBtn} ${picked?.type === "walk_in" ? "" : styles.cta}`} aria-pressed={picked?.type === "walk_in"} onClick={() => update((s) => ({ ...s, facility: { type: "walk_in" } }))}>
          {picked?.type === "walk_in" ? t("whenWalkChosen") : t("whenWalkChoose")}
        </button>
      </section>
    );
  }
  if (a.kind !== "slots") return <div className={styles.card}><p className={styles.title}>{t("whenNoWin")}</p><button type="button" className={styles.linkBtn} onClick={reload}>{t("retry")}</button></div>;
  return (
    <section className={styles.card} aria-label={t("whenCentreTitle")}>
      <h2 className={styles.title}>{t("whenCentreTitle")}</h2>
      <div className={styles.chips} role="group" aria-label={t("whenDayAria")}>
        {days.map((d, i) => (
          <button key={d} type="button" className={styles.chip} aria-pressed={day === d} onClick={() => setDay(d)}>{i === 0 ? t("whenToday") : dayText(locale, `${d}T12:00:00`)}</button>
        ))}
      </div>
      {a.slots.length === 0 ? (
        <p className={styles.sub}>{t("whenNoSlots")}</p>
      ) : (
        <div className={styles.grid} role="group" aria-label={t("whenSlotAria")}>
          {a.slots.map((s) => (
            <button key={s.id} type="button" className={styles.chip} aria-pressed={picked?.type === "slot" && picked.id === s.id} onClick={() => update((cur) => ({ ...cur, facility: { type: "slot", id: s.id, start: s.start, end: s.end } }))}>
              <bdi>{slotText(locale, s.start)}</bdi>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
