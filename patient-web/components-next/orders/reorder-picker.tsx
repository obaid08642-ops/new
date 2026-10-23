"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { Stepper } from "@/components-next/ui-generated/components/Inputs";
import { AddressCard } from "@/components-next/pharmacy/address-card";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { useDeliveryAddress } from "@/components-next/pharmacy/use-delivery-address";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import { createBroadcastAttempt } from "@/lib/pharmacy/broadcast";
import { sendCartRequest, type SendFailure } from "@/lib/pharmacy/send-cart";
import { cartItemsFor, type CatalogueLine } from "@/lib/pharmacy/order-view";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

const MAX_QTY = 99;
type Pick = { on: boolean; qty: number };

/**
 * Ordering an earlier order again, as the app does: the lines the API returned for it, each with a tick and a quantity,
 * the delivery address, and "Send request", which sends a NEW request to the pharmacies (the same two calls as the
 * checkout) with the patient's current address and the pharmacies' current prices, and opens the new order's offers.
 * The browser cart is not touched by that. "Add to cart instead" keeps the older way: the lines go into the cart. A line the catalogue does not know (a typed
 * request) has no product to put in the cart and is not added; the screen says how many.
 */
export function ReorderPicker({ locale, orderId, lines, skipped, needsPrescription, prescriptionId, fulfillment = "delivery" }: { locale: string; orderId: string; lines: CatalogueLine[]; skipped: number; needsPrescription: boolean; prescriptionId?: string; fulfillment?: "delivery" | "pickup" }) {
  const t = useTranslations("OrderReorder");
  const cart = useTranslations("CartScreen");
  const checkout = useTranslations("PharmacyCheckout");
  const flow = useTranslations("PharmacyFlow");
  const router = useRouter();
  const { addItem } = useCart();
  const [picks, setPicks] = useState<Record<string, Pick>>(() => Object.fromEntries(lines.map((line) => [line.id, { on: true, qty: line.qty }])));
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<SendFailure | null>(null);
  const attempt = useRef(createBroadcastAttempt());
  const address = useDeliveryAddress(lines.length > 0);
  const chosen = lines.filter((line) => picks[line.id]?.on);

  if (lines.length === 0) {
    return (
      <div className={rx.state} role="status">
        <EmptyState icon="pill" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("backToOrder")} onAction={() => router.push(`/${locale}/orders/${encodeURIComponent(orderId)}`)} />
        {skipped > 0 ? <div className={styles.skipped}><p className={rx.note}>{t("skipped", { count: skipped })}</p><Link className={rx.textLink} href={`/${locale}/pharmacy/rx-order?via=type`}>{t("sendRequest")}</Link></div> : null}
      </div>
    );
  }

  const canSend = chosen.length > 0 && address.status === "ready" && !sending && !adding;

  // a new request, the same single-flight send as the checkout; the cart is left exactly as it is
  async function send() {
    if (!canSend || address.status !== "ready") return;
    setSending(true);
    setFailure(null);
    const outcome = await sendCartRequest(
      attempt.current,
      {
        kind: "cart",
        lines: cartItemsFor(lines, picks, needsPrescription).map((item) => ({ name: item.name, qty: item.qty, sku: item.id })),
        paymentMode: "cash",
        fulfillment,
        ...(prescriptionId ? { prescriptionId, rxNames: [] } : {}),
      },
      address.address,
      () => undefined,
    );
    if (outcome.status === "busy") return;
    if (outcome.status === "sent") {
      router.push(`/${locale}/pharmacy/broadcast-status?orderId=${encodeURIComponent(outcome.orderId)}`);
      return; // the button stays disabled until the page changes
    }
    setSending(false);
    setFailure(outcome.failure);
  }

  const add = () => {
    if (adding || chosen.length === 0) return;
    setAdding(true);
    for (const item of cartItemsFor(lines, picks, needsPrescription)) addItem(item);
    router.push(`/${locale}/cart`);
  };

  return (
    <>
      <p className={rx.lead}>{t("lead")}</p>
      <section className={`${rx.card} ${rx.cardFlush}`} aria-label={t("linesLabel")}>
        <ul className={styles.pickList}>
          {lines.map((line) => {
            const pick = picks[line.id];
            return (
              <li className={styles.pick} key={line.id}>
                <label className={styles.pickLabel}>
                  <input type="checkbox" checked={pick.on} onChange={() => setPicks((all) => ({ ...all, [line.id]: { ...pick, on: !pick.on } }))} />
                  <span className={styles.pickName}>{line.name}</span>
                  {needsPrescription ? <StatusChip label={cart("needsRx")} tone="amber" /> : null}
                </label>
                {pick.on ? (
                  <Stepper
                    value={pick.qty}
                    onChange={(next) => setPicks((all) => ({ ...all, [line.id]: { ...pick, qty: Math.min(MAX_QTY, Math.max(1, next)) } }))}
                    min={1}
                    max={MAX_QTY}
                    label={cart("quantity", { name: line.name })}
                    format={(n) => formatNumber(locale, n)}
                    decrementLabel={cart("decrease", { name: line.name })}
                    incrementLabel={cart("increase", { name: line.name })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
      {needsPrescription ? <p className={`${styles.notice} ${styles.noticeWarn}`}>{t("rxNote")}</p> : null}
      {skipped > 0 ? <div className={styles.skipped}><p className={rx.note}>{t("skipped", { count: skipped })}</p><Link className={rx.textLink} href={`/${locale}/pharmacy/rx-order?via=type`}>{t("sendRequest")}</Link></div> : null}
      {chosen.length === 0 ? <p className={rx.note} role="status">{t("pickOne")}</p> : null}
      <AddressCard locale={locale} state={address} />
      {failure ? (
        <div className={rx.error} role="alert">
          {failure === "session" ? flow("sessionEnded") : failure === "forbidden" ? checkout("errorForbidden") : failure === "network" ? checkout("errorNetwork") : failure === "server" ? checkout("errorServer") : checkout("errorSend")}
          {failure === "session" ? <div className={rx.errorActions}><Link className={rx.textLink} href={`/${locale}/login`}>{flow("signIn")}</Link></div> : null}
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button label={sending ? checkout("sending") : checkout("send")} fullWidth disabled={!canSend} loading={sending} onClick={() => void send()} />
        <Button label={t("addToCart")} variant="outline" fullWidth disabled={chosen.length === 0 || sending} loading={adding} onClick={add} />
      </div>
    </>
  );
}
