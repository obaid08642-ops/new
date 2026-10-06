"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { Segmented, StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { LocalDate } from "./local-date";
import { statusKey } from "@/components-next/pharmacy-offers/status";
import { orderAction, orderNumber, isPrevious, type OrderAction, type OrderRow } from "@/lib/pharmacy/order-view";
import { statusTone } from "./status-tone";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

type Tab = "current" | "previous";

/** Where an order's action goes: its page for what can be done next, reordering for a finished order. */
export function actionHref(locale: string, id: string, action: OrderAction): string {
  const encoded = encodeURIComponent(id);
  switch (action) {
    case "reorder": return `/${locale}/pharmacy/reorder?orderId=${encoded}`;
    case "track": return `/${locale}/orders/${encoded}/tracking`;
    case "continue": return `/${locale}/pharmacy/order-confirm?orderId=${encoded}`;
    default: return `/${locale}/orders/${encoded}`;
  }
}

/**
 * The orders of canvas/Orders: two tabs (current, previous) and one card per order with its number, date, status, the
 * price the server stored for the selected offer, and the one action that fits the order. A price is drawn only when
 * the server has one; before an offer is selected the card says how many items the order has instead.
 */
export function OrderList({ locale, rows }: { locale: string; rows: OrderRow[] }) {
  const t = useTranslations("Orders");
  const offers = useTranslations("PharmacyOffers");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => (rows.some((row) => !isPrevious(row.status)) || rows.length === 0 ? "current" : "previous"));
  const shown = rows.filter((row) => (tab === "previous") === isPrevious(row.status));

  return (
    <>
      <div className={styles.tabs}>
        <Segmented
          label={t("tabsLabel")}
          size="sm"
          value={tab}
          onChange={(value) => setTab(value === "previous" ? "previous" : "current")}
          options={[{ value: "current", label: t("tabCurrent") }, { value: "previous", label: t("tabPrevious") }]}
        />
      </div>
      {shown.length === 0 ? (
        <div className={rx.state} role="status">
          <EmptyState
            icon="pill"
            tone={PHARMACY_TONE}
            title={t(tab === "current" ? "emptyCurrentTitle" : "emptyPreviousTitle")}
            body={t(tab === "current" ? "emptyCurrentBody" : "emptyPreviousBody")}
            actionLabel={tab === "current" ? t("browse") : undefined}
            onAction={() => router.push(`/${locale}/pharmacy`)}
          />
        </div>
      ) : (
        <ul className={styles.list} aria-label={t(tab === "current" ? "tabCurrent" : "tabPrevious")}>
          {shown.map((row) => {
            const action = orderAction(row.status);
            return (
              <li className={styles.order} key={row.id}>
                <Link className={styles.orderLink} href={`/${locale}/orders/${encodeURIComponent(row.id)}`}>
                  <FIcon icon="pill" tone={PHARMACY_TONE} size={44} />
                  <span className={styles.orderText}>
                    <span className={styles.orderTitle}>{t("pharmacyOrder")}</span>
                    <span className={styles.orderMeta}>
                      <bdi>{t("orderRef", { number: orderNumber(row.id) })}</bdi>
                      {row.createdAt ? <> · <LocalDate iso={row.createdAt} locale={locale} /></> : null}
                    </span>
                  </span>
                  <span className={styles.orderChip}>
                    <StatusChip label={offers(`status.${statusKey(row.status)}`)} tone={statusTone(row.status)} />
                  </span>
                </Link>
                <div className={styles.orderFoot}>
                  {row.total !== undefined ? (
                    <span className={styles.amount}>{formatMoney(locale, row.total, row.currency)}</span>
                  ) : row.itemCount !== undefined ? (
                    <span className={styles.itemsOnly}>{t("itemsCount", { count: row.itemCount })}</span>
                  ) : <span />}
                  <ButtonLink href={actionHref(locale, row.id, action)} label={t(`action.${action}`)} variant="outline" size="sm" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
