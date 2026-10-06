"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Segmented, StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState, Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { AddressCard } from "@/components-next/pharmacy/address-card";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { useDeliveryAddress } from "@/components-next/pharmacy/use-delivery-address";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import { createBroadcastAttempt, type BroadcastRequest } from "@/lib/pharmacy/broadcast";
import { activePrescriptionId, parseInsurancePolicy, type InsurancePolicyView } from "@/lib/pharmacy/checkout-support";
import rx from "@/components-next/pharmacy/rx.module.css";
import ov from "@/components-next/pharmacy-offers/offers.module.css";
import styles from "./checkout.module.css";

type Fulfillment = "delivery" | "pickup";
type PaymentMode = "cash" | "insurance";
type PrescriptionState = { status: "idle" } | { status: "loading" } | { status: "found"; id: string } | { status: "missing" } | { status: "error" } | { status: "unauthenticated" };
type PolicyState = { status: "idle" } | { status: "loading" } | { status: "ok"; policy: InsurancePolicyView } | { status: "none" } | { status: "error" };
type Failure = "session" | "forbidden" | "network" | "send";

/**
 * Step one of the pharmacy flow (canvas/CheckoutV2 layout): the cart of this browser becomes a request to the nearby
 * pharmacies (POST /patient/pharmacy/orders, then /submit, the two calls the mobile app makes). There is no price here:
 * the delivery fee and the final price come from the offer the patient chooses, so nothing is added up on this screen.
 * Sending is single-flight (a ref plus the disabled button) and keeps one idempotency key until the server has answered,
 * so a retry after a dropped connection cannot create a second order.
 */
export function CheckoutScreen({ locale }: { locale: Locale }) {
  const t = useTranslations("PharmacyCheckout");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const { items, ready, clearCart, hasRxItems } = useCart();
  const active = ready && items.length > 0;
  const address = useDeliveryAddress(active);

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [prescription, setPrescription] = useState<PrescriptionState>({ status: "idle" });
  const [policy, setPolicy] = useState<PolicyState>({ status: "idle" });
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const attempt = useRef(createBroadcastAttempt());

  // a cart with prescription medicines is ordered with the patient's saved, active prescription
  useEffect(() => {
    if (!active || !hasRxItems) return;
    let live = true;
    setPrescription({ status: "loading" });
    void fetch("/api/patient/prescriptions/active", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!live) return;
        if (response.status === 401) return setPrescription({ status: "unauthenticated" });
        if (!response.ok) return setPrescription({ status: "error" });
        const id = activePrescriptionId(await response.json().catch(() => null));
        setPrescription(id ? { status: "found", id } : { status: "missing" });
      })
      .catch(() => live && setPrescription({ status: "error" }));
    return () => {
      live = false;
    };
  }, [active, hasRxItems]);

  // the saved insurance, only when the patient asks for the insurance path
  useEffect(() => {
    if (!active || mode !== "insurance" || policy.status !== "idle") return;
    let live = true;
    setPolicy({ status: "loading" });
    void fetch("/api/patient/insurance/my-policy", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!live) return;
        if (!response.ok) return setPolicy({ status: "error" });
        const parsed = parseInsurancePolicy(await response.json().catch(() => null));
        setPolicy(parsed ? { status: "ok", policy: parsed } : { status: "none" });
      })
      .catch(() => live && setPolicy({ status: "error" }));
    return () => {
      live = false;
    };
  }, [active, mode, policy.status]);

  const prescriptionOk = !hasRxItems || prescription.status === "found";
  const insuranceOk = mode === "cash" || policy.status === "ok";
  const canSend = active && address.status === "ready" && prescriptionOk && insuranceOk && !sending;

  async function send() {
    if (!canSend || address.status !== "ready") return;
    const request: BroadcastRequest = {
      kind: "cart",
      lines: items.map((item) => ({ name: item.name, qty: item.qty, sku: item.id })),
      paymentMode: mode,
      fulfillment,
      ...(hasRxItems && prescription.status === "found" ? { prescriptionId: prescription.id } : {}),
    };
    setSending(true);
    setFailure(null);
    // one send at a time, one idempotency key per request until the server has answered (see createBroadcastAttempt)
    const result = await attempt.current.run(request, address.address);
    if (!result) return; // another send is already in flight: nothing was sent
    if (result.ok) {
      clearCart();
      router.push(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(result.orderId)}`);
      return; // the button stays disabled until the page changes
    }
    setSending(false);
    setFailure(result.reason === "unauthenticated" ? "session" : result.status === 403 ? "forbidden" : result.status === undefined ? "network" : "send");
  }

  const sendButton = <Button label={sending ? t("sending") : t("send")} size="lg" fullWidth disabled={!canSend} loading={sending} onClick={() => void send()} />;
  const count = items.reduce((sum, item) => sum + item.qty, 0);

  let body;
  if (!ready) {
    body = (
      <div role="status" aria-busy="true">
        <span className={rx.srOnly}>{t("loading")}</span>
        <Skeleton variant="block" />
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className={rx.state}>
        <EmptyState
          icon="pill"
          tone={PHARMACY_TONE}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          actionLabel={t("browse")}
          onAction={() => router.push(`/${locale}/c`)}
          secondaryActionLabel={t("openCart")}
          onSecondaryAction={() => router.push(`/${locale}/cart`)}
        />
      </div>
    );
  } else {
    body = (
      <>
        <section className={rx.card} aria-labelledby="checkout-request">
          <div className={rx.cardRow}>
            <FIcon icon="storefront" tone={PHARMACY_TONE} size={44} />
            <div className={rx.cardBody}>
              <h2 className={rx.h2} id="checkout-request">{t("requestTitle")}</h2>
              <span className={rx.cardLabel}>{t("requestLead")}</span>
            </div>
          </div>
          <ul className={styles.items} aria-label={t("itemsLabel")}>
            {items.map((item) => (
              <li className={styles.item} key={item.id}>
                <span className={styles.itemName} dir="auto">{item.name}</span>
                <span className={styles.itemQty}>{t("lineQty", { qty: item.qty })}</span>
                {item.rx ? <span className={styles.itemChip}><StatusChip label={t("needsRx")} tone={OFFER_TONES.warn} /></span> : null}
              </li>
            ))}
          </ul>
        </section>

        {hasRxItems ? <PrescriptionNotice state={prescription} locale={locale} /> : null}

        <section className={styles.group} aria-labelledby="checkout-fulfil">
          <h2 className={styles.legend} id="checkout-fulfil">{t("fulfilLegend")}</h2>
          <div className={styles.segmented}>
            <Segmented
              label={t("fulfilLegend")}
              value={fulfillment}
              onChange={(value) => setFulfillment(value === "pickup" ? "pickup" : "delivery")}
              options={[{ value: "delivery", label: t("fulfilDelivery") }, { value: "pickup", label: t("fulfilPickup") }]}
              disabled={sending}
            />
          </div>
          <AddressCard locale={locale} state={address} />
        </section>

        <section className={styles.group} aria-labelledby="checkout-pay">
          <h2 className={styles.legend} id="checkout-pay">{t("payLegend")}</h2>
          <div className={styles.segmented}>
            <Segmented
              label={t("payLegend")}
              value={mode}
              onChange={(value) => setMode(value === "insurance" ? "insurance" : "cash")}
              options={[{ value: "cash", label: t("payDirect") }, { value: "insurance", label: t("payInsurance") }]}
              disabled={sending}
            />
          </div>
          {mode === "insurance" ? <InsuranceCard state={policy} locale={locale} /> : null}
          <p className={rx.note}>{t("payNote")}</p>
        </section>

        <section className={rx.card} aria-label={t("summaryTitle")}>
          <dl className={styles.rows}>
            <div className={styles.row}><dt>{t("summaryItems")}</dt><dd>{formatNumber(locale, count)}</dd></div>
            <div className={styles.row}><dt>{t("summaryDelivery")}</dt><dd>{t("summaryDeliveryValue")}</dd></div>
            <hr className={styles.rowDivider} />
            <div className={`${styles.row} ${styles.rowTotal}`}><dt>{t("summaryTotal")}</dt><dd>{t("summaryTotalValue")}</dd></div>
          </dl>
        </section>

        <p className={rx.note}>{t("sendNote")}</p>

        {failure ? (
          <div className={rx.error} role="alert">
            {failure === "session" ? flow("sessionEnded") : failure === "forbidden" ? t("errorForbidden") : failure === "network" ? t("errorNetwork") : t("errorSend")}
            {failure === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
          </div>
        ) : null}

        <div className={rx.deskActions}>{sendButton}</div>
      </>
    );
  }

  return (
    <CoreShell
      locale={locale}
      title={t("title")}
      backHref={`/${locale}/cart`}
      hideTabs
      width="narrow"
      footer={active ? <StickyFooter label={t("title")}><div className={rx.bar}>{sendButton}</div></StickyFooter> : undefined}
    >
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {body}
      </div>
    </CoreShell>
  );
}

/** A cart with prescription medicines needs a saved prescription: say which of the real answers it got. */
function PrescriptionNotice({ state, locale }: { state: PrescriptionState; locale: Locale }) {
  const t = useTranslations("PharmacyCheckout");
  if (state.status === "idle" || state.status === "loading") return <p className={rx.note} role="status">{t("rxChecking")}</p>;
  if (state.status === "found") return <p className={`${ov.notice} ${ov.noticeOk}`} role="status">{t("rxAttached")}</p>;
  if (state.status === "unauthenticated") return null;
  if (state.status === "error") return <p className={rx.error} role="alert">{t("rxCheckFailed")}</p>;
  return (
    <div className={rx.banner} role="alert">
      <div className={rx.bannerBody}>
        <span className={rx.bannerTitle}>{t("rxMissingTitle")}</span>
        <span className={rx.bannerText}>{t("rxMissingBody")}</span>
      </div>
      <Link className={rx.bannerAction} href={`/${locale}/pharmacy/scan-prescription`}>{t("rxUpload")}</Link>
    </div>
  );
}

/** The insurance row of canvas/CheckoutV2: who insures the patient, from the saved policy; no number is drawn. */
function InsuranceCard({ state, locale }: { state: PolicyState; locale: Locale }) {
  const t = useTranslations("PharmacyCheckout");
  if (state.status === "idle" || state.status === "loading") {
    return <section className={rx.card} aria-busy="true" aria-label={t("insuranceLoading")}><Skeleton variant="text" lines={2} /></section>;
  }
  if (state.status === "error") return <p className={rx.error} role="alert">{t("insuranceUnavailable")}</p>;
  if (state.status === "none") {
    return (
      <section className={rx.card} aria-label={t("insuranceNone")}>
        <div className={rx.cardRow}>
          <FIcon icon="shield-check" tone={OFFER_TONES.info} size={44} />
          <div className={rx.cardBody}>
            <span className={rx.cardValue}>{t("insuranceNone")}</span>
            <span className={rx.cardLabel}>{t("insuranceNoneBody")}</span>
          </div>
          <Link className={rx.cardLink} href={`/${locale}/insurance/add-policy`}>{t("insuranceAdd")}</Link>
        </div>
      </section>
    );
  }
  const { company, planClass } = state.policy;
  return (
    <section className={rx.card} aria-label={t("insuranceCardTitle")}>
      <div className={rx.cardRow}>
        <FIcon icon="shield-check" tone={OFFER_TONES.info} size={44} />
        <div className={rx.cardBody}>
          <span className={rx.cardValue} dir="auto">{company ?? t("insuranceCardTitle")}</span>
          {planClass ? <span className={rx.cardLabel} dir="auto">{t("insuranceClass", { class: planClass })}</span> : null}
          <span className={rx.cardLabel}>{t("insuranceBody")}</span>
        </div>
      </div>
    </section>
  );
}
