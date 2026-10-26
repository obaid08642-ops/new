"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import type { Locale } from "@/lib/i18n";
import { forgetPayment, recallPayment } from "@/lib/pharmacy/payment-return";
import { parseOrderPaymentView, parseVerification, type PaymentOutcome } from "@/lib/pharmacy/payment-state";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./checkout.module.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CHECKS = 15;
const INTERVAL_MS = 3000;

type Phase =
  | { kind: "checking" }
  /** The backend says the payment is complete. The only phase that is ever drawn as a success. */
  | { kind: "paid" }
  /** The backend has not settled it yet (still open at the provider). */
  | { kind: "pending" }
  /** We asked MAX_CHECKS times and it is still open: say so, do not guess. */
  | { kind: "stalled" }
  | { kind: "failed" }
  | { kind: "refunded" }
  /** The order was cancelled or expired and nothing was paid. */
  | { kind: "expired" }
  /** The address names no payment this browser can ask the backend about. */
  | { kind: "unknown" }
  /** The backend could not be reached. */
  | { kind: "error" };

/** What the backend's transaction names: the booking it pays for. */
type Booking = { kind: string; id: string };
type Ids = { orderId?: string; transactionId?: string; gatewayRef?: string; booking?: Booking };

/** The page of the booking a payment was for, where its own pay button and its status live (issues 1055 and 1087). */
export function bookingHref(locale: string, booking: Booking | undefined): string | undefined {
  if (!booking || !UUID.test(booking.id)) return undefined;
  const id = encodeURIComponent(booking.id);
  switch (booking.kind) {
    case "pharmacy": return `/${locale}/orders/${id}/tracking`;
    case "consultation": return `/${locale}/appointments/${id}`;
    case "lab": return `/${locale}/diagnostics/bookings/labs/${id}`;
    case "radiology": return `/${locale}/diagnostics/bookings/radiology/${id}`;
    case "insurance": return `/${locale}/insurance/requests/${id}`;
    case "diagnostics": return `/${locale}/diagnostics/bookings`;
    default: return undefined;
  }
}

const bookingOf = (record: Record<string, unknown>): Booking | undefined =>
  typeof record.bookingKind === "string" && typeof record.bookingId === "string" && UUID.test(record.bookingId)
    ? { kind: record.bookingKind, id: record.bookingId } : undefined;

/**
 * Ask the backend what happened, and only the backend. Two real reads, in this order:
 *   1. the order (`GET /patient/pharmacy/orders/:id`): `payment_status === "paid"` is the server's confirmation;
 *   2. the transaction: its stored status (`GET /payments/status/:ref`, read-only), or with `refresh` the explicit
 *      `POST /payments/verify/:txn`, where the backend asks the provider and records the answer (issues 534 and 550).
 * A word in the address (`?status=paid`) is never read.
 */
export async function checkPayment(ids: Ids, doFetch: typeof fetch = fetch, refresh = false): Promise<{ phase: Phase; ids: Ids }> {
  let { orderId, transactionId, booking } = ids;
  const { gatewayRef } = ids;
  if (!orderId && !transactionId && !gatewayRef) return { phase: { kind: "unknown" }, ids };
  let reached = false;
  let closed = false;

  // The provider sends the patient back with its own payment id only: the backend's stored status names our transaction
  // and the booking it pays for (consultation, lab, radiology, insurance co-pay, diagnostics or a pharmacy order).
  if (!transactionId && gatewayRef) {
    try {
      const response = await doFetch(`/api/payments/status/${encodeURIComponent(gatewayRef)}`, { credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        reached = true;
        const body: unknown = await response.json().catch(() => null);
        const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        if (typeof record.transactionId === "string" && UUID.test(record.transactionId)) transactionId = record.transactionId;
        booking = booking ?? bookingOf(record);
        if (!orderId && booking?.kind === "pharmacy") orderId = booking.id;
      }
    } catch {
      // the reads below decide
    }
  }

  if (orderId) {
    try {
      const response = await doFetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, { credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        reached = true;
        const view = parseOrderPaymentView(await response.json().catch(() => null));
        if (view?.paymentStatus === "paid") return { phase: { kind: "paid" }, ids };
        closed = view?.governedState === "CANCELLED" || ["cancelled", "expired"].includes((view?.status ?? "").toLowerCase());
      }
    } catch {
      // the next read decides
    }
  }

  if (transactionId) {
    try {
      const response = refresh
        ? await doFetch(`/api/payments/verify/${encodeURIComponent(transactionId)}`, { method: "POST", credentials: "same-origin", cache: "no-store" })
        : await doFetch(`/api/payments/status/${encodeURIComponent(transactionId)}`, { credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        reached = true;
        const body: unknown = await response.json().catch(() => null);
        const verified = parseVerification(body);
        const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        // the verified transaction names its booking (and the pharmacy order) when the address did not
        booking = booking ?? bookingOf(record);
        if (!orderId && booking?.kind === "pharmacy") orderId = booking.id;
        if (verified) {
          const outcome: PaymentOutcome = verified.outcome;
          if (outcome === "paid") return { phase: { kind: "paid" }, ids: { orderId, transactionId, gatewayRef, booking } };
          if (outcome === "failed") return { phase: { kind: "failed" }, ids: { orderId, transactionId, gatewayRef, booking } };
          if (outcome === "refunded") return { phase: { kind: "refunded" }, ids: { orderId, transactionId, gatewayRef, booking } };
        }
      }
    } catch {
      // the answer below says the backend could not be reached
    }
  }

  const next = { orderId, transactionId, gatewayRef, booking };
  if (!reached) return { phase: { kind: "error" }, ids: next };
  return { phase: closed ? { kind: "expired" } : { kind: "pending" }, ids: next };
}

type Shown = { icon: FillIconName; tone: ServiceTone; key: string };
const SHOWN: Record<Exclude<Phase["kind"], "checking">, Shown> = {
  paid: { icon: "check-circle", tone: OFFER_TONES.good, key: "success" },
  pending: { icon: "clock-counter-clockwise", tone: OFFER_TONES.info, key: "processing" },
  stalled: { icon: "clock-counter-clockwise", tone: OFFER_TONES.warn, key: "stalled" },
  failed: { icon: "warning", tone: OFFER_TONES.warn, key: "failed" },
  refunded: { icon: "info", tone: OFFER_TONES.info, key: "refunded" },
  expired: { icon: "warning", tone: OFFER_TONES.warn, key: "expired" },
  unknown: { icon: "info", tone: OFFER_TONES.info, key: "unknown" },
  error: { icon: "wifi-slash", tone: OFFER_TONES.warn, key: "error" },
};

type Props = {
  locale: Locale;
  /** The provider's payment id or our reference, drawn as text only. */
  reference?: string;
  /** Our own transaction reference, when the address carried one. */
  transactionId?: string;
  /** The provider's payment id (`?id=`), which the backend resolves to our transaction and its booking. */
  gatewayRef?: string;
  orderId?: string;
};

/** `/payments/result`: what the backend says about the payment the patient just made. Success appears only when it says "paid". */
export function PaymentResult({ locale, reference, transactionId, gatewayRef, orderId }: Props) {
  const t = useTranslations("Payments");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [round, setRound] = useState(0);
  const ids = useRef<Ids>({ orderId, transactionId, gatewayRef });

  const recheck = useCallback(() => {
    setPhase({ kind: "checking" });
    setRound((value) => value + 1);
  }, []);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    // the provider sends the patient back with its own payment id only: the payment screen left a pointer to ours
    if (round === 0 && (!ids.current.orderId || !ids.current.transactionId)) {
      const pointer = recallPayment();
      if (pointer && (!ids.current.orderId || ids.current.orderId === pointer.orderId)) {
        ids.current = { ...ids.current, orderId: ids.current.orderId ?? pointer.orderId, transactionId: ids.current.transactionId ?? pointer.transactionId };
      }
    }
    const tick = async () => {
      checks += 1;
      // the stored status on most checks; the provider is asked (verify) on the first one and then every fourth
      const result = await checkPayment(ids.current, fetch, checks === 1 || checks % 4 === 0);
      if (!live) return;
      ids.current = result.ids;
      const settled = result.phase.kind !== "pending" && result.phase.kind !== "error";
      if (settled) {
        if (["paid", "failed", "refunded"].includes(result.phase.kind)) forgetPayment();
        setPhase(result.phase);
        return;
      }
      if (checks >= MAX_CHECKS) {
        setPhase(result.phase.kind === "error" ? result.phase : { kind: "stalled" });
        return;
      }
      setPhase(result.phase.kind === "error" ? { kind: "checking" } : result.phase);
      timer = setTimeout(() => void tick(), INTERVAL_MS);
    };
    void tick();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [round]);

  const orders = `/${locale}/orders`;
  const known = ids.current.orderId;
  const bookingPage = known ? undefined : bookingHref(locale, ids.current.booking);
  let content;
  if (phase.kind === "checking") {
    content = (
      <div className={styles.checking} role="status" aria-busy="true">
        <EmptyState icon="clock-counter-clockwise" tone={OFFER_TONES.info} title={t("checkingTitle")} body={t("checkingBody")} />
      </div>
    );
  } else {
    const shown = SHOWN[phase.kind];
    const goOrders = { label: t("myOrders"), run: () => router.push(orders) };
    const primary =
      phase.kind === "paid" && known ? { label: t("trackOrder"), run: () => router.push(`/${locale}/orders/${encodeURIComponent(known)}/tracking`) }
      : phase.kind === "paid" && bookingPage ? { label: t("openBooking"), run: () => router.push(bookingPage) }
      : phase.kind === "pending" || phase.kind === "stalled" || phase.kind === "error" ? { label: t("checkAgain"), run: recheck }
      : phase.kind === "failed" && known ? { label: t("retry"), run: () => router.push(`/${locale}/pharmacy/payment?orderId=${encodeURIComponent(known)}`) }
      : phase.kind === "failed" && bookingPage ? { label: t("retry"), run: () => router.push(bookingPage) }
      : goOrders;
    const secondary = primary === goOrders ? undefined : goOrders;
    content = (
      <div role={phase.kind === "failed" || phase.kind === "error" ? "alert" : "status"} className={phase.kind === "paid" ? "nabd-success-pop" : undefined}>
        <EmptyState
          icon={shown.icon}
          tone={shown.tone}
          title={t(`${shown.key}Title`)}
          body={t(`${shown.key}Body`)}
          actionLabel={primary.label}
          onAction={primary.run}
          secondaryActionLabel={secondary?.label}
          onSecondaryAction={secondary?.run}
        />
      </div>
    );
  }

  return (
    <CoreShell locale={locale} title={t("pageTitle")} backHref={orders} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("pageTitle")}</h1></div>
        <div className={styles.result}>
          {content}
          {reference ? <p className={styles.reference}>{t("reference")}: <bdi>{reference}</bdi></p> : null}
        </div>
      </div>
    </CoreShell>
  );
}
