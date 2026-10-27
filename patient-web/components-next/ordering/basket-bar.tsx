"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { contextQuery } from "@/lib/ordering/context";
import type { OrderMode, Payer, ServiceKind } from "@/lib/ordering/quote";
import { useBasket } from "./use-basket";
import styles from "./ordering.module.css";

/** "Basket · n items" with a link to the basket, shown on a service screen once something is in the basket. */
export function BasketBar({ locale, kind, place, pay }: { locale: string; kind: ServiceKind; place: OrderMode; pay: Payer }) {
  const t = useTranslations("OrderingFlow");
  const { basket } = useBasket();
  const n = basket[kind].length;
  const ref = useRef<HTMLDivElement>(null);
  // The shell's bottom area (page CTA + tab bar, with its safe-area padding) is sticky at the viewport edge and draws over a
  // sticky bar inside the page: lift the bar by that area's height (0 when the page hides the tabs).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bottom = document.querySelector<HTMLElement>(".nabd-shell__bottom");
    const set = () => el.style.setProperty("--nabd-basket-bottom-h", `${bottom && getComputedStyle(bottom).display !== "none" ? bottom.offsetHeight : 0}px`);
    set();
    if (!bottom || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(bottom);
    return () => ro.disconnect();
  }, [n]);
  if (n === 0) return null;
  return (
    <div ref={ref} className={styles.basketBar} data-testid="basket-bar" role="region" aria-label={t("basket")}>
      <span className={styles.basketBarText}>{t("basketBar", { n })}</span>
      <Link href={`/${locale}/labs/basket${contextQuery({ kind, place, pay })}`} className={styles.basketBarLink}>{t("viewBasket")}</Link>
    </div>
  );
}
