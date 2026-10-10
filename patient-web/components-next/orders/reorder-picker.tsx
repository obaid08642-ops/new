"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { Stepper } from "@/components-next/ui-generated/components/Inputs";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import { cartItemsFor, type CatalogueLine } from "@/lib/pharmacy/order-view";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

const MAX_QTY = 99;
type Pick = { on: boolean; qty: number };

/**
 * Ordering an earlier order again: the lines the API returned for it, each with a tick and a quantity, put into the
 * cart of this browser. Nothing is sent to a pharmacy from here: the cart's own checkout does that, with a fresh
 * request, the patient's current address and the pharmacies' current prices. A line the catalogue does not know (a typed
 * request) has no product to put in the cart and is not added; the screen says how many.
 */
export function ReorderPicker({ locale, orderId, lines, skipped, needsPrescription }: { locale: string; orderId: string; lines: CatalogueLine[]; skipped: number; needsPrescription: boolean }) {
  const t = useTranslations("OrderReorder");
  const cart = useTranslations("CartScreen");
  const router = useRouter();
  const { addItem } = useCart();
  const [picks, setPicks] = useState<Record<string, Pick>>(() => Object.fromEntries(lines.map((line) => [line.id, { on: true, qty: line.qty }])));
  const [adding, setAdding] = useState(false);
  const chosen = lines.filter((line) => picks[line.id]?.on);

  if (lines.length === 0) {
    return (
      <div className={rx.state} role="status">
        <EmptyState icon="pill" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("backToOrder")} onAction={() => router.push(`/${locale}/orders/${encodeURIComponent(orderId)}`)} />
        {skipped > 0 ? <div className={styles.skipped}><p className={rx.note}>{t("skipped", { count: skipped })}</p><Link className={rx.textLink} href={`/${locale}/pharmacy/rx-order?via=type`}>{t("sendRequest")}</Link></div> : null}
      </div>
    );
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
      <div className={styles.actions}>
        <Button label={t("addToCart")} fullWidth disabled={chosen.length === 0} loading={adding} onClick={add} />
      </div>
    </>
  );
}
