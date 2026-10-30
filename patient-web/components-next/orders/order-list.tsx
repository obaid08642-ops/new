"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { Segmented, StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Chip } from "@/components-next/ui-generated/components/Surfaces";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { CenterRow, OrderKind, ResultRow } from "./center-rows";
import { KIND_ORDER, ordersQuery, type OrdersTab as Tab } from "./orders-query";
import { FieldText } from "@/components-next/ui/localized-field";
import { LocalDate } from "./local-date";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

/**
 * The orders of canvas/Orders, for every service (issue 378): two tabs (current, previous) and one card per order with
 * its title, number or kind, date, status, the price the server stored (pharmacy), and the one action that fits. The
 * rows arrive with their labels already in the reader's language (./center-rows), newest first.
 */
export function OrderList({ locale, rows, results, partialNote, initialTab, initialKind }: { locale: string; rows: CenterRow[]; results: ResultRow[]; partialNote?: string; initialTab?: Tab; initialKind?: OrderKind | null }) {
  const t = useTranslations("Orders");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => initialTab ?? (rows.some((row) => row.bucket === "current") || rows.length === 0 ? "current" : "previous"));
  const [kind, setKind] = useState<OrderKind | null>(initialKind ?? null);
  const kinds = KIND_ORDER.filter((value) => rows.some((row) => row.kind === value));
  // a filter whose service has no rows falls back to All
  const activeKind = kind !== null && kinds.includes(kind) ? kind : null;
  // the tab and the service live in the URL (?tab=previous&kind=labs) so a reload or a shared link keeps them
  const remember = (nextTab: Tab, nextKind: OrderKind | null) => {
    setTab(nextTab);
    setKind(nextKind);
    router.replace(ordersQuery(`/${locale}/orders`, nextTab, nextKind), { scroll: false });
  };
  const shown = rows.filter((row) => row.bucket === tab && (activeKind === null || row.kind === activeKind));

  return (
    <>
      {partialNote ? <p className={styles.itemsOnly} role="status">{partialNote}</p> : null}
      <div className={styles.tabs}>
        <Segmented
          label={t("tabsLabel")}
          size="sm"
          value={tab}
          onChange={(value) => remember(value === "previous" || value === "results" ? value : "current", activeKind)}
          options={[{ value: "current", label: t("tabCurrent") }, { value: "results", label: t("tabResults") }, { value: "previous", label: t("tabPrevious") }]}
        />
      </div>
      {tab !== "results" && kinds.length > 1 ? (
        <div className={styles.kindChips} role="group" aria-label={t("filterLabel")}>
          <Chip label={t("filterAll")} selected={activeKind === null} onClick={() => remember(tab, null)} />
          {kinds.map((value) => (
            <Chip key={value} label={t(`filterKind.${value}`)} selected={activeKind === value} onClick={() => remember(tab, value)} />
          ))}
        </div>
      ) : null}
      {tab === "results" ? (
        results.length === 0 ? (
          <div className={rx.state} role="status">
            <EmptyState icon="test-tube" tone={DIAG_TONES.good} title={t("emptyResultsTitle")} body={t("emptyResultsBody")} />
          </div>
        ) : (
          <ul className={styles.list} aria-label={t("tabResults")}>
            {results.map((row) => (
              <li className={styles.order} key={row.key}>
                <Link className={styles.orderLink} href={row.viewHref}>
                  <FIcon icon={row.icon} tone={row.tone} size={44} />
                  <span className={styles.orderText}>
                    <span className={styles.orderTitle}><FieldText text={row.title} mark={row.titleMark} /></span>
                    <span className={styles.orderMeta}>
                      <bdi>{t(`kind.${row.domain}`)}</bdi>
                      {row.at ? <> · <LocalDate iso={row.at} locale={locale} /></> : null}
                    </span>
                  </span>
                  <span className={styles.orderChip}><StatusChip label={t("resultReady")} tone={DIAG_TONES.good} /></span>
                </Link>
                <div className={styles.resultActions}>
                  <ButtonLink href={row.viewHref} label={t("resultView")} variant="outline" size="sm" />
                  {row.pdfHref ? <ButtonLink href={row.pdfHref} label={t("resultPdf")} variant="outline" size="sm" /> : null}
                  <ButtonLink href={`/${locale}/consultations/doctors`} label={t("resultBook")} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )
      ) : shown.length === 0 ? (
        <div className={rx.state} role="status">
          <EmptyState
            icon="pill"
            tone={PHARMACY_TONE}
            title={activeKind ? t(tab === "current" ? "emptyKindCurrentTitle" : "emptyKindPreviousTitle", { service: t(`filterKind.${activeKind}`) }) : t(tab === "current" ? "emptyCurrentTitle" : "emptyPreviousTitle")}
            body={activeKind ? t("emptyKindBody") : t(tab === "current" ? "emptyCurrentBody" : "emptyPreviousBody")}
            actionLabel={activeKind ? t("filterAll") : tab === "current" ? t("browse") : undefined}
            onAction={() => (activeKind ? remember(tab, null) : router.push(`/${locale}/pharmacy`))}
          />
        </div>
      ) : (
        <ul className={styles.list} aria-label={t(tab === "current" ? "tabCurrent" : "tabPrevious")}>
          {shown.map((row) => (
            <li className={styles.order} key={row.key}>
              <Link className={styles.orderLink} href={row.href}>
                <FIcon icon={row.icon} tone={row.tone} size={44} />
                <span className={styles.orderText}>
                  <span className={styles.orderTitle}><FieldText text={row.title} mark={row.titleMark} /></span>
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
