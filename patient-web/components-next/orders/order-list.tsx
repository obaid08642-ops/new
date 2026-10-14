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
import type { CenterRow } from "./center-rows";
import { LocalDate } from "./local-date";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

type Tab = "current" | "previous";

/**
 * The orders of canvas/Orders, for every service (issue 378): two tabs (current, previous) and one card per order with
 * its title, number or kind, date, status, the price the server stored (pharmacy), and the one action that fits. The
 * rows arrive with their labels already in the reader's language (./center-rows), newest first.
 */
export function OrderList({ locale, rows, partialNote }: { locale: string; rows: CenterRow[]; partialNote?: string }) {
  const t = useTranslations("Orders");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => (rows.some((row) => row.bucket === "current") || rows.length === 0 ? "current" : "previous"));
  const shown = rows.filter((row) => row.bucket === tab);

  return (
    <>
      {partialNote ? <p className={styles.itemsOnly} role="status">{partialNote}</p> : null}
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
          {shown.map((row) => (
            <li className={styles.order} key={row.key}>
              <Link className={styles.orderLink} href={row.href}>
                <FIcon icon={row.icon} tone={row.tone} size={44} />
                <span className={styles.orderText}>
                  <span className={styles.orderTitle}>{row.title}</span>
                  <span className={styles.orderMeta}>
                    <bdi>{row.meta}</bdi>
                    {row.at ? <> · <LocalDate iso={row.at} locale={locale} /></> : null}
                  </span>
                </span>
                <span className={styles.orderChip}>
                  <StatusChip label={row.statusLabel} tone={row.statusTone} />
                </span>
              </Link>
              <div className={styles.orderFoot}>
                {row.amount ? <span className={styles.amount}>{row.amount}</span> : row.itemsText ? <span className={styles.itemsOnly}>{row.itemsText}</span> : <span />}
                <ButtonLink href={row.action.href} label={row.action.label} variant="outline" size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
