"use client";

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
  if (n === 0) return null;
  return (
    <div className={styles.basketBar} data-testid="basket-bar" role="region" aria-label={t("basket")}>
      <span className={styles.basketBarText}>{t("basketBar", { n })}</span>
      <Link href={`/${locale}/labs/basket${contextQuery({ kind, place, pay })}`} className={styles.basketBarLink}>{t("viewBasket")}</Link>
    </div>
  );
}
