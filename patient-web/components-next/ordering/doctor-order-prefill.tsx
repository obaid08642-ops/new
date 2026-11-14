"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { BasketLine } from "@/lib/ordering/basket";
import { hasLine } from "@/lib/ordering/basket";
import type { ServiceKind } from "@/lib/ordering/quote";
import { pickLineName } from "@/lib/ordering/format";
import { useBasket } from "./use-basket";
import styles from "./ordering.module.css";

/**
 * The doctor's order in the basket (owner decision 2026-11-08, ordering screens): the items of the order group the patient pressed Order on
 * are PRE-CHECKED, that is already in the basket, once per order in this tab. Each can be unticked (it leaves the basket and stays open in
 * "My medical orders") and ticked again; none is locked.
 */
export function DoctorOrderPrefill({ locale, kind, orderId, lines }: { locale: string; kind: ServiceKind; orderId: string; lines: BasketLine[] }) {
  const t = useTranslations("OrderingFlow");
  const { basket, add, remove } = useBasket();
  useEffect(() => {
    const key = `nabd_order_prefill_${orderId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch { /* storage blocked: the items are added on every visit of this address */ }
    for (const line of lines) add(kind, line);
    // once per order: the address carries the same items on a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
  return (
    <section className={styles.card} aria-label={t("fromOrderTitle")}>
      <h2 className={styles.title}>{t("fromOrderTitle")}</h2>
      <p className={styles.sub}>{t("fromOrderSub")}</p>
      <ul className={styles.items}>
        {lines.map((line) => {
          const on = hasLine(basket, kind, line.id);
          return (
            <li key={line.id}>
              <label className={styles.prefillRow}>
                <input type="checkbox" className={styles.prefillBox} checked={on} onChange={() => (on ? remove(kind, line.id) : add(kind, line))} />
                <span className={styles.itemName}>{pickLineName(locale, line) ?? t("unnamedItem")}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
