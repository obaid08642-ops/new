"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { choosePartial, OrderingApiError, pressEmergency } from "@/lib/ordering/client";
import { moneyText } from "@/lib/ordering/format";
import {
  awaitingChoice, isCancelled, isWaiting, lifecycleErrorKey, paymentKey, secondsUntil, statusKey, stepsOf,
  type Approval, type BookingView, type Choice, type Reminder, type Visit,
} from "@/lib/ordering/lifecycle";
import { clock } from "@/lib/ordering/schedule";
import styles from "./ordering.module.css";

type Props = { locale: string; booking: BookingView; approval: Approval | null; visit: Visit | null; reminders: Reminder[]; resultsReady: boolean; names: Record<string, string> };

const REFRESH_MS = 20_000;
const STEP_KEY = { paid: "waitSt1", confirm: "waitSt2", insurance: "waitSt3", visit: "waitSt4" } as const;
const REMINDER_KEY = { fasting_night: "trackRemNight", fasting_morning: "trackRemMorning", preparation: "trackRemPrep" } as const;
const errKey = (e: unknown) => (e instanceof OrderingApiError ? (e.code === "network" ? "errNetwork" : lifecycleErrorKey(e.code)) : "errGeneric");
const when = (locale: string, iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/**
 * Ord08-Ord10: one ordering booking. Every amount, state, time, name and code is read from the server (GET /ordering/bookings/:id,
 * /approval, /visit, /reminders, /results); the screen adds nothing up and estimates nothing (insurance and payment: server numbers only).
 */
export function BookingStatusClient({ locale, booking, approval, visit, reminders, resultsReady, names }: Props) {
  const t = useTranslations("OrderingFlow");
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [picked, setPicked] = useState<Choice | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [phase, setPhase] = useState<"idle" | "choosing" | "sos">("idle");
  const [done, setDone] = useState<{ choice: Choice; share: number | null } | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosCall, setSosCall] = useState<string | null>(null);
  const busy = useRef(false);
  const refreshed = useRef(false);

  const cancelled = isCancelled(booking);
  const waiting = isWaiting(booking);
  const left = now === null ? null : secondsUntil(booking.confirmDeadlineAt, now);
  const mustChoose = awaitingChoice(approval) && !done;
  const insured = approval !== null;

  useEffect(() => {
    setNow(Date.now());
    if (!waiting) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => router.refresh(), REFRESH_MS);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [waiting, router]);

  useEffect(() => {
    if (left === 0 && !refreshed.current) { refreshed.current = true; router.refresh(); }
  }, [left, router]);

  async function submit() {
    if (!picked || busy.current) return;
    busy.current = true;
    setPhase("choosing");
    setErrorKey(null);
    try {
      const a = await choosePartial(booking.id, picked);
      setDone({ choice: a.choice, share: a.patientShareTotal });
      setConfirmCancel(false);
      router.refresh();
    } catch (e) {
      setErrorKey(errKey(e));
      if (e instanceof OrderingApiError && e.code === "choice_not_pending") router.refresh();
    } finally {
      busy.current = false;
      setPhase("idle");
    }
  }

  async function raiseAlert() {
    if (busy.current) return;
    busy.current = true;
    setPhase("sos");
    setErrorKey(null);
    try {
      setSosCall((await pressEmergency(booking.id)).call);
    } catch (e) {
      setErrorKey(errKey(e));
    } finally {
      busy.current = false;
      setPhase("idle");
    }
  }

  const modeLabel = booking.mode === "home" ? t("trackModeHome") : t("trackModeFacility");
  const payKey = paymentKey(booking.payment.status);
  const itemName = (id: string, n: number) => names[id] ?? t("partItemN", { n });
  const steps = stepsOf(booking, insured, approval);
  const tracking = !cancelled && !!visit && (visit.staff !== null || booking.status === "assigned" || booking.status === "in_service" || booking.status === "confirmed");

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-label={t("trackTitle")}>
        <div className={styles.cardHead}>
          <h2 className={styles.title}>{modeLabel}</h2>
          {booking.total !== null ? <span className={styles.priceBig}><bdi>{moneyText(locale, booking.total)}</bdi></span> : null}
        </div>
        <p className={styles.sub} role="status" aria-live="polite">{t(`track${statusKey(booking)}`)}</p>
        {payKey ? <p className={styles.sub}>{t("trackPayLine", { status: t(`track${payKey}`) })}</p> : null}
        {booking.payment.refundStatus ? <p className={styles.sub}>{t("trackRefundStarted")}</p> : null}
        {!cancelled ? (
          <div role="list">
            {steps.map((s) => (
              <div key={s.key} role="listitem" className={styles.stage} data-state={s.state} aria-current={s.state === "now" ? "step" : undefined}>
                <span>{t(STEP_KEY[s.key])}</span>
              </div>
            ))}
          </div>
        ) : null}
        <p className={styles.sub}>{t("trackSeparate")}</p>
      </section>

      {booking.confirmDeadlineAt && !cancelled && left !== null ? (
        <section className={styles.card} aria-label={t("waitPLeft")}>
          <p className={styles.sub}>{t("waitPLeft")}</p>
          <p className={styles.clock} role="timer"><bdi>{clock(locale, left)}</bdi></p>
          <p className={styles.note}>{t("waitPEnd")}</p>
        </section>
      ) : null}

      {approval && approval.status === "pending" && !cancelled ? (
        <section className={styles.card} aria-label={t("waitATitle")}>
          <h2 className={styles.title}>{t("waitATitle")}</h2>
          {approval.estimatedShareTotal !== null ? <div className={styles.line}><span>{t("waitEstimate")}</span><bdi>{moneyText(locale, approval.estimatedShareTotal)}</bdi></div> : null}
          <p className={styles.sub}>{t("waitAEnd")}</p>
          {booking.mode === "home" ? <p className={styles.sub}>{t("waitAHome")}</p> : null}
        </section>
      ) : null}

      {approval && approval.status !== "pending" && !cancelled ? (
        <section className={styles.card} aria-label={t("partTitle")}>
          <h2 className={styles.title}>{approval.status === "approved" ? t("partHeadApproved") : approval.status === "partial" ? t("partHeadPartial") : t("partHeadRejected")}</h2>
          {mustChoose ? <p className={styles.sub}>{t("partHeadSub")}</p> : null}
          <ul className={styles.items}>
            {approval.items.map((i, n) => (
              <li key={i.catalogId}>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{itemName(i.catalogId, n + 1)}</span>
                  <span className={styles.shares}>
                    <span>{i.decision === "approved" ? t("partDApproved") : i.decision === "rejected" ? t("partDRejected") : t("partDNot")}</span>
                    {i.insurerShare !== null ? <span>{t("partColIns")}: <bdi>{moneyText(locale, i.insurerShare)}</bdi></span> : null}
                    {i.patientShare !== null ? <span>{t("partColYou")}: <bdi>{moneyText(locale, i.patientShare)}</bdi></span> : null}
                  </span>
                </span>
              </li>
            ))}
            {approval.homeFee ? (
              <li>
                <span className={styles.itemText}><span className={styles.itemName}>{t("partFee")}</span></span>
                <span className={styles.price}>{approval.homeFee.covered ? t("partFeeCovered") : <bdi>{moneyText(locale, approval.homeFee.amount)}</bdi>}</span>
              </li>
            ) : null}
          </ul>
          {approval.patientShareTotal !== null ? <div className={styles.lineTotal}><span>{t("partFinalShare")}</span><bdi>{moneyText(locale, approval.patientShareTotal)}</bdi></div> : null}
          {approval.expiresBeforeVisit ? (
            <div className={styles.warnBox} role="note">
              <p className={styles.sub}>{t("waitAWarn")}</p>
              {approval.rebookEarlier ? <Link href={`/${locale}/labs`} className={styles.linkBtn}>{t("waitRebook")}</Link> : null}
            </div>
          ) : null}
          {mustChoose && approval.validUntil ? <p className={styles.sub}>{t("partExpires", { when: when(locale, approval.validUntil) })}</p> : null}
          {mustChoose ? (
            <div className={styles.fieldset} role="group" aria-label={t("partTitle")}>
              {approval.choices.map((c) => (
                <button key={c} type="button" className={`${styles.linkBtn} ${styles.optionBtn}`} aria-pressed={picked === c} disabled={phase === "choosing"} onClick={() => { setPicked(c); setConfirmCancel(false); setErrorKey(null); }}>
                  <strong>{c === "pay_difference" ? t("partO1") : c === "covered_only" ? t("partO2") : t("partO3")}</strong>
                  <span className={styles.sub}>
                    {c === "pay_difference" ? (approval.patientShareTotal !== null ? t("partO1Sub", { amount: moneyText(locale, approval.patientShareTotal) }) : "") : c === "covered_only" ? t("partO2Sub") : t("partO3Sub")}
                  </span>
                </button>
              ))}
              {picked && picked !== "cancel_free" ? (
                <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={phase === "choosing"} onClick={submit}>{picked === "pay_difference" ? t("partConfirm1") : t("partConfirm2")}</button>
              ) : null}
              {picked === "cancel_free" && !confirmCancel ? (
                <button type="button" className={`${styles.linkBtn} ${styles.cta}`} onClick={() => setConfirmCancel(true)}>{t("partConfirm3")}</button>
              ) : null}
              {picked === "cancel_free" && confirmCancel ? (
                <div className={styles.note} role="alertdialog" aria-label={t("partSheetTitle")}>
                  <strong>{t("partSheetTitle")}</strong>
                  <p className={styles.sub}>{t("partSheetBody")}</p>
                  <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={phase === "choosing"} onClick={submit}>{t("partConfirm3")}</button>
                  <button type="button" className={styles.linkBtn} disabled={phase === "choosing"} onClick={() => setConfirmCancel(false)}>{t("partKeep")}</button>
                </div>
              ) : null}
              {phase === "choosing" ? <p className={styles.sub} role="status">{t("partApplying")}</p> : null}
            </div>
          ) : null}
          {done ? (
            <div className={styles.note} role="status">
              <strong>{t("partDoneTitle")}</strong>
              <p className={styles.sub}>{done.choice === "cancel_free" ? t("partDoneCancel") : done.share !== null ? t("partDoneBody", { amount: moneyText(locale, done.share) }) : ""}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {cancelled ? (
        <section className={styles.card} aria-label={t("waitETitle")}>
          <h2 className={styles.title}>{booking.alternative ? t("waitETitle") : t("trackStCancelled")}</h2>
          {booking.payment.refundStatus ? (
            <>
              <p className={styles.sub}>{t("waitERefund")}</p>
              <p className={styles.note}><strong>{t("waitEDone")}</strong> · {t("waitRefundTime")}</p>
            </>
          ) : null}
          {booking.alternative ? (
            <div className={styles.note}>
              <strong>{t("waitEAlt")}</strong>
              <p className={styles.sub}>{t("waitEAltLine", { price: moneyText(locale, booking.alternative.total), when: when(locale, booking.alternative.earliestAt) })}</p>
            </div>
          ) : null}
          <Link href={`/${locale}/labs`} className={`${styles.linkBtn} ${styles.cta}`}>{t("waitEOther")}</Link>
        </section>
      ) : null}

      {tracking && visit ? (
        <section className={styles.card} aria-label={t("trackVisitTitle")}>
          <h2 className={styles.title}>{t("trackVisitTitle")}</h2>
          {visit.staff ? (
            <div className={styles.row}>
              {visit.staff.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.avatar} src={visit.staff.photoUrl} alt={t("trackPhotoAlt", { name: visit.staff.name })} width={56} height={56} />
              ) : null}
              <span className={styles.itemText}>
                <span className={styles.itemName}>{visit.staff.name}</span>
                {visit.staff.license ? <span className={styles.sub}>{t("trackLicence", { n: visit.staff.license })}</span> : null}
              </span>
            </div>
          ) : (
            <p className={styles.sub}>{t("trackNoStaff")}</p>
          )}
          {visit.arrivalCode ? (
            <div className={styles.note}>
              <strong>{t("trackCodeTitle")}</strong>
              <p className={styles.code} aria-label={visit.arrivalCode.split("").join(" ")}>{visit.arrivalCode}</p>
              <p className={styles.sub}>{t("trackCodeHint")}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {reminders.length > 0 && !cancelled ? (
        <section className={styles.card} aria-label={t("trackRemTitle")}>
          <h2 className={styles.title}>{t("trackRemTitle")}</h2>
          <ul className={styles.items}>
            {reminders.map((r) => (
              <li key={`${r.kind}-${r.at}`}>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{when(locale, r.at)}</span>
                  <span className={styles.sub}>{t(REMINDER_KEY[r.kind])}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {resultsReady ? (
        <section className={styles.card} aria-label={t("trackResultsReady")}>
          <h2 className={styles.title}>{t("trackResultsReady")}</h2>
          <Link href={`/${locale}/diagnostics/results`} className={`${styles.linkBtn} ${styles.cta}`}>{t("trackResultsOpen")}</Link>
        </section>
      ) : null}

      {errorKey ? <div className={styles.errorBox} role="alert">{t(errorKey)}</div> : null}

      {!cancelled && booking.status !== "pending" ? (
        <section className={styles.card} aria-label={t("trackSos")}>
          {!sosOpen ? (
            <button type="button" className={`${styles.linkBtn} ${styles.danger}`} onClick={() => setSosOpen(true)}>{t("trackSos")}</button>
          ) : (
            <div role="alertdialog" aria-label={t("trackSosTitle")} className={styles.stack}>
              <h2 className={styles.title}>{t("trackSosTitle")}</h2>
              {sosCall ? (
                <>
                  <p className={styles.sub} role="status">{t("trackSosDone")}</p>
                  <a href={`tel:${sosCall}`} className={`${styles.linkBtn} ${styles.danger}`}><bdi>{t("trackSosCall", { phone: sosCall })}</bdi></a>
                </>
              ) : (
                <>
                  <p className={styles.sub}>{t("trackSosBody")}</p>
                  <button type="button" className={`${styles.linkBtn} ${styles.danger}`} disabled={phase === "sos"} onClick={raiseAlert}>{t("trackSosBtn")}</button>
                  <button type="button" className={styles.linkBtn} disabled={phase === "sos"} onClick={() => setSosOpen(false)}>{t("trackSosCancel")}</button>
                </>
              )}
            </div>
          )}
        </section>
      ) : null}

      <Link href={`/${locale}/diagnostics/bookings`} className={styles.linkBtn}>{t("whenOpenBookings")}</Link>
    </div>
  );
}
