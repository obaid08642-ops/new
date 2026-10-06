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

type Ids = { orderId?: string; transactionId?: string };

/**
 * Ask the backend what happened, and only the backend. Two real reads, in this order:
 *   1. the order (`GET /patient/pharmacy/orders/:id`): `payment_status === "paid"` is the server's confirmation;
 *   2. the transaction (`POST /payments/verify/:txn`, through the bounded route): the backend asks the provider and records the answer.
 * A word in the address (`?status=paid`) is never read.
 */
export async function checkPayment(ids: Ids, doFetch: typeof fetch = fetch): Promise<{ phase: Phase; ids: Ids }> {
  let { orderId, transactionId } = ids;
  if (!orderId && !transactionId) return { phase: { kind: "unknown" }, ids };
  let reached = false;
  let closed = false;

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
      const response = await doFetch(`/api/payments/verify/${encodeURIComponent(transactionId)}`, { method: "POST", credentials: "same-origin", cache: "no-store" });
      if (response.ok) {
        reached = true;
        const body: unknown = await response.json().catch(() => null);
        const verified = parseVerification(body);
        const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        // the verified transaction names its order when the address did not
        if (!orderId && record.bookingKind === "pharmacy" && typeof record.bookingId === "string" && UUID.test(record.bookingId)) orderId = record.bookingId;
        if (verified) {
          const outcome: PaymentOutcome = verified.outcome;
          if (outcome === "paid") return { phase: { kind: "paid" }, ids: { orderId, transactionId } };
          if (outcome === "failed") return { phase: { kind: "failed" }, ids: { orderId, transactionId } };
          if (outcome === "refunded") return { phase: { kind: "refunded" }, ids: { orderId, transactionId } };
        }
      }
    } catch {
      // the answer below says the backend could not be reached
    }
  }

  const next = { orderId, transactionId };
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
  orderId?: string;
};

/** `/payments/result`: what the backend says about the payment the patient just made. Success appears only when it says "paid". */
export function PaymentResult({ locale, reference, transactionId, orderId }: Props) {
  const t = useTranslations("Payments");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [round, setRound] = useState(0);
  const ids = useRef<Ids>({ orderId, transactionId });

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
        ids.current = { orderId: ids.current.orderId ?? pointer.orderId, transactionId: ids.current.transactionId ?? pointer.transactionId };
      }
    }
    const tick = async () => {
      checks += 1;
      const result = await checkPayment(ids.current);
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
      : phase.kind === "pending" || phase.kind === "stalled" || phase.kind === "error" ? { label: t("checkAgain"), run: recheck }
      : phase.kind === "failed" && known ? { label: t("retry"), run: () => router.push(`/${locale}/pharmacy/payment?orderId=${encodeURIComponent(known)}`) }
      : goOrders;
    const secondary = primary === goOrders ? undefined : goOrders;
    content = (
      <div role={phase.kind === "failed" || phase.kind === "error" ? "alert" : "status"}>
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
