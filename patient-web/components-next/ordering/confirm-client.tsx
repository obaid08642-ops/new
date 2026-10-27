"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import type { MedicalOrder } from "@/lib/medical-orders/medical-orders";
import { parseChoice, SELECTION_KEY, type ChosenGroup, type ProviderChoice } from "@/lib/ordering/basket";
import { createBooking, OrderingApiError, payBooking } from "@/lib/ordering/client";
import type { OrderingBookingResult } from "@/lib/ordering/bookings";
import { contextQuery } from "@/lib/ordering/context";
import { moneyText, pickLineName, pickName } from "@/lib/ordering/format";
import { orderingErrorKey, type OrderMode, type Payer, type ServiceKind, type StaffGender } from "@/lib/ordering/quote";
import { buildBookingRequest, DOC_MAX_CHARS, evidenceReady, orderCovers, parseSchedule, payableNow, SCHEDULE_KEY, whenSummary, type Evidence, type Schedule } from "@/lib/ordering/schedule";
import { CoverageChip, QuoteLoading } from "./quote-parts";
import { useOrderLines } from "./use-order-lines";
import styles from "./ordering.module.css";
import { UploadsGate } from "@/components-next/uploads/uploads-provider";

type Props = { locale: string; kind: ServiceKind; place: OrderMode; pay: Payer; item?: string; orders: MedicalOrder[] | null; prep: Record<string, string[]> };
type Doc = { filename: string; data: string };

const keyOf = (e: unknown) => (e instanceof OrderingApiError ? (e.code === "network" ? "errNetwork" : orderingErrorKey(e.code)) : "errGeneric");
const read = <T,>(key: string, parse: (raw: string | null) => T): T => { try { return parse(window.sessionStorage.getItem(key)); } catch { return parse(null); } };
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ord07: confirm and pay. Everything priced here is a server number kept from the quote (display only); the amount that is charged is the
 * booking's own total on the server (POST /payments/intent/lab/:id takes no amount). The booking group is created once (the quote can be
 * used once: the server answers 409 `quote_already_booked` to a repeat) and each payment tap is guarded against a second submit.
 */
export function ConfirmClient({ locale, kind, place, pay, item, orders, prep }: Props) {
  const t = useTranslations("OrderingFlow");
  const router = useRouter();
  // a one-item order ("Order now") leaves the cart alone: `remove` does nothing then
  const { lines, remove } = useOrderLines(kind, item);
  const [choice, setChoice] = useState<ProviderChoice | null | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [gender, setGender] = useState<StaffGender | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | undefined>(undefined);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderingBookingResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "creating" | "paying">("idle");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const busy = useRef(false);
  const attempts = useRef(0);
  const insured = pay === "insurance";

  useEffect(() => {
    const c = read(SELECTION_KEY, parseChoice);
    setChoice(c);
    const s = read(SCHEDULE_KEY, parseSchedule);
    setSchedule(c && s && s.quoteId === c.quoteId ? s : null);
  }, []);

  const modes = (["home", "facility"] as const).filter((m) => choice?.[m]);
  const allIds = useMemo(() => modes.flatMap((m) => choice?.groups?.[m]?.itemIds ?? []), [choice]); // eslint-disable-line react-hooks/exhaustive-deps
  const eligible = useMemo(() => (orders ?? []).filter((o) => orderCovers(o, allIds)), [orders, allIds]);
  useEffect(() => { if (insured && eligible.length === 1) setOrderId((cur) => cur ?? eligible[0].id); }, [insured, eligible]);

  const timeHref = `/${locale}/labs/when${contextQuery({ kind, place, pay, item })}`;
  if (choice === undefined) return <QuoteLoading label={t("whenLoading")} />;
  if (!choice || !schedule || modes.length === 0 || modes.some((m) => !schedule[m])) {
    return <EmptyState icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={t("payNoTimeTitle")} body={t("payNoTimeSub")} actionLabel={t("payBackTime")} onAction={() => router.push(timeHref)} />;
  }

  const nameOf = (id: string) => { const l = lines.find((x) => x.id === id); return l ? pickLineName(locale, l) : undefined; };
  const evidence: Evidence = { ...(orderId ? { medicalOrderId: orderId } : {}), ...(doc && !orderId ? { documents: [{ kind: "doctor_request" as const, url_or_b64: doc.data, filename: doc.filename }] } : {}) };
  const ready = evidenceReady(insured, evidence);
  const groups = modes.map((m) => choice.groups?.[m]).filter((g): g is ChosenGroup => !!g);
  // The overall figure is shown only when every booking carries the server's own number for it.
  const due = groups.length === modes.length ? groups.map((g) => (insured ? g.patientShare : g.total)) : [];
  const dueTotal = due.length > 0 && due.every((n): n is number => typeof n === "number") ? r2(due.reduce((s, n) => s + n, 0)) : null;

  const onFile = async (file: File | undefined) => {
    setDocError(null);
    if (!file) return;
    if (!/^(image\/|application\/pdf$)/.test(file.type)) { setDocError(t("payDocType")); return; }
    const data = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || "")); r.onerror = () => resolve(""); r.readAsDataURL(file); });
    if (!data) { setDocError(t("payDocRead")); return; }
    if (data.length > DOC_MAX_CHARS) { setDocError(t("payDocSize")); return; }
    setDoc({ filename: file.name.slice(0, 200), data });
    setOrderId(undefined);
  };

  const startPayment = async (bookingId: string) => {
    if (busy.current) return;
    busy.current = true; setPhase("paying"); setPayingId(bookingId); setErrorKey(null); setFailedId(null);
    attempts.current += 1;
    try {
      const intent = await payBooking(bookingId, `web-ord-pay-${bookingId}-${attempts.current}`.padEnd(16, "0"));
      if (!intent.checkoutUrl) throw new OrderingApiError("request_failed", 502);
      window.location.assign(intent.checkoutUrl); // the hosted Moyasar page; the page stays in "processing" until the browser leaves
    } catch (e) {
      setErrorKey(keyOf(e)); setFailedId(bookingId); setPhase("idle"); setPayingId(null); busy.current = false;
    }
  };

  const submit = async () => {
    if (busy.current || !ready || result) return;
    const body = buildBookingRequest({ schedule, home: choice.home, facility: choice.facility, insured, gender: modes.includes("home") ? gender : undefined, evidence });
    if (!body) { setErrorKey("errGeneric"); return; }
    busy.current = true; setPhase("creating"); setErrorKey(null);
    try {
      const made = await createBooking(body);
      setResult(made);
      for (const id of allIds) remove(kind, id);
      try { window.sessionStorage.removeItem(SELECTION_KEY); window.sessionStorage.removeItem(SCHEDULE_KEY); } catch { /* nothing to clear */ }
      const payable = made.bookings.filter(payableNow);
      busy.current = false; setPhase("idle");
      if (!insured && payable.length === 1) await startPayment(payable[0].id);
    } catch (e) {
      setErrorKey(keyOf(e)); setPhase("idle"); busy.current = false;
    }
  };

  if (result) {
    const payable = result.bookings.filter(payableNow);
    return (
      <div className={styles.stack}>
        <section className={styles.card} aria-label={t("payCreatedTitle")} aria-live="polite">
          <h2 className={styles.title}>{t("payCreatedTitle")}</h2>
          {insured ? <p className={styles.sub}>{t("payDispatch")}</p> : <p className={styles.sub}>{t("payCreatedSub")}</p>}
          {!insured ? <div className={styles.lineTotal}><span>{t("payDueNow")}</span><bdi>{moneyText(locale, result.payment.amount)}</bdi></div> : null}
          <ul className={styles.items}>
            {result.bookings.map((b, i) => (
              <li key={b.id}>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{b.mode === "home" ? t("payB1") : t("payB2")}{result.bookings.length > 1 ? ` · ${i + 1}` : ""}</span>
                  <span className={styles.sub}>{b.status === "awaiting_approval" ? t("payStatusApproval") : t("payStatusPending")}</span>
                </span>
                <Link href={`/${locale}/labs/bookings/${encodeURIComponent(b.id)}`} className={`${styles.linkBtn} ${styles.removeBtn}`}>{t("trackOpen")}</Link>
                {!insured && payableNow(b) ? <span className={styles.price}><bdi>{moneyText(locale, b.total)}</bdi></span> : null}
                {!insured && payableNow(b) && payable.length > 1 ? (
                  <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={phase === "paying"} onClick={() => startPayment(b.id)}>{t("payBookingBtn")}</button>
                ) : null}
              </li>
            ))}
          </ul>
          {phase === "paying" ? (
            <div className={styles.note} role="status"><strong>{t("payProcessing")}</strong><p className={styles.sub}>{t("payProcessingSub")}</p></div>
          ) : null}
          {errorKey ? (
            <div className={styles.errorBox} role="alert">
              <strong>{t("payFailTitle")}</strong>
              <p className={styles.sub}>{t(errorKey)}</p>
              {failedId ? <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={phase === "paying"} onClick={() => startPayment(failedId)}>{t("payTryAgain")}</button> : null}
            </div>
          ) : null}
          <Link href={`/${locale}/diagnostics/bookings`} className={styles.linkBtn}>{t("whenOpenBookings")}</Link>
        </section>
      </div>
    );
  }

  const modeTitle = (m: OrderMode) => (m === "home" ? t("payB1") : t("payB2"));
  const btn = insured ? t("payConfirmIns") : dueTotal !== null ? t("payBtn", { amount: moneyText(locale, dueTotal) }) : t("payBtnGeneric");

  return (
    <div className={styles.stack}>
      {modes.map((m) => {
        const g = choice.groups?.[m];
        const time = schedule[m];
        const ids = g?.itemIds ?? [];
        const items = g?.lines ?? [];
        const itemsTotal = g?.lines ? r2(g.lines.reduce((s, l) => s + l.price, 0)) : null;
        const prepLines = Array.from(new Set(ids.flatMap((id) => prep[id] ?? [])));
        return (
          <section key={m} className={styles.card} aria-label={modeTitle(m)}>
            <div className={styles.cardHead}>
              <h2 className={styles.title}>{modeTitle(m)}</h2>
              <Link href={timeHref} className={`${styles.linkBtn} ${styles.removeBtn}`}>{t("payEdit")}</Link>
            </div>
            <div className={styles.line}><span>{t("payPlace")}</span><span>{m === "home" ? t("homeVisit") : t("atCentre")}{g ? ` · ${pickName(locale, g.nameAr, g.nameEn) ?? ""}` : ""}</span></div>
            <div className={styles.line}><span>{t("whenSumWhen")}</span><span>{time?.type === "walk_in" ? t("whenModeWalk") : whenSummary(locale, time)}</span></div>
            <ul className={styles.items} aria-label={t("payItems")}>
              {ids.map((id) => {
                const line = items.find((l) => l.catalogId === id);
                return (
                  <li key={id}>
                    <span className={styles.itemText}>
                      <span className={styles.itemName}>{nameOf(id) ?? t("unnamedItem")}</span>
                      {insured && line?.coverage ? <span className={styles.chips}><CoverageChip coverage={line.coverage} /></span> : null}
                    </span>
                    {line ? <span className={styles.price}><bdi>{moneyText(locale, line.price)}</bdi></span> : null}
                  </li>
                );
              })}
            </ul>
            {prepLines.length > 0 ? (
              <div>
                <p className={styles.itemName}>{t("payPrep")}</p>
                <ul className={styles.sub}>{prepLines.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ) : null}
            {g ? (
              <div className={styles.stack}>
                {itemsTotal !== null ? <div className={styles.line}><span>{t("payLItems", { n: ids.length })}</span><bdi>{moneyText(locale, itemsTotal)}</bdi></div> : null}
                {g.homeFee !== undefined && g.homeFee > 0 ? <div className={styles.line}><span>{t("sumFee")}</span><bdi>{moneyText(locale, g.homeFee)}</bdi></div> : null}
                {insured && g.estimatedInsuranceShare !== undefined ? <div className={styles.line}><span>{t("payLIns")}</span><bdi>{moneyText(locale, g.estimatedInsuranceShare)}</bdi></div> : null}
                <div className={styles.lineTotal}><span>{t("payLBooking")}</span><bdi>{moneyText(locale, insured ? g.patientShare ?? g.total : g.total)}</bdi></div>
              </div>
            ) : null}
          </section>
        );
      })}

      {modes.includes("home") ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t("payGender")}</legend>
          <div className={styles.chips}>
            {([undefined, "female", "male"] as const).map((g) => (
              <button key={g ?? "any"} type="button" className={styles.chip} aria-pressed={gender === g} onClick={() => setGender(g)}>
                {g === undefined ? t("payGAny") : g === "female" ? t("payGF") : t("payGM")}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {insured ? (
        <section className={styles.card} aria-label={t("payOrder")}>
          <h2 className={styles.title}>{t("payOrder")}</h2>
          {orders === null ? <p className={styles.errorBox} role="alert">{t("payOrdersErr")}</p> : null}
          {eligible.length > 0 ? (
            <div className={styles.stack} role="radiogroup" aria-label={t("payOrderPick")}>
              {eligible.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={orderId === o.id} className={styles.chip} onClick={() => { setOrderId(o.id); setDoc(null); }}>
                  {t("payOrderValid", { d: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(o.valid_until)) })}
                </button>
              ))}
            </div>
          ) : orders !== null ? <p className={styles.sub}>{t("payOrderNone")}</p> : null}
          <UploadsGate className={styles.sub}>
            <label className={styles.sub}>
              {t("payOrderFile")}
              <input className={styles.fileInput} type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </UploadsGate>
          {doc ? <p className={styles.sub}>{doc.filename} <button type="button" className={`${styles.linkBtn} ${styles.removeBtn}`} onClick={() => setDoc(null)}>{t("remove")}</button></p> : null}
          {docError ? <p className={styles.errorBox} role="alert">{docError}</p> : null}
          {!ready ? <p className={styles.sub}>{t("payOrderReq")}</p> : null}
        </section>
      ) : null}

      <section className={styles.card} aria-label={t("payLines")}>
        <h2 className={styles.title}>{t("payLines")}</h2>
        {dueTotal !== null ? <div className={styles.lineTotal}><span>{t("payDueNow")}</span><bdi>{moneyText(locale, dueTotal)}</bdi></div> : null}
        {insured ? <p className={styles.sub}>{t("payEstNote")}</p> : null}
        {insured ? <p className={styles.sub}>{t("cashNote")}</p> : null}
        {insured && modes.includes("home") ? <p className={styles.sub}>{t("payDispatch")}</p> : null}
        <p className={styles.sub}>{t("payLocked")}</p>
        {!insured ? <p className={styles.sub}>{t("paySecure")}</p> : null}
        {phase === "creating" ? <div className={styles.note} role="status"><strong>{t("payProcessing")}</strong><p className={styles.sub}>{t("payProcessingSub")}</p></div> : null}
        {errorKey && phase !== "paying" ? <p className={styles.errorBox} role="alert">{t(errorKey)}</p> : null}
        <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={!ready || phase !== "idle"} aria-busy={phase !== "idle"} onClick={submit}>{ready ? btn : t("payBtnOff")}</button>
        <p className={styles.sub}>{t("payCancelFree")}</p>
      </section>
    </div>
  );
}
