"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { Segmented, StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Chip } from "@/components-next/ui-generated/components/Surfaces";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { CenterRow, OrderKind } from "./center-rows";
import { LocalDate } from "./local-date";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./orders.module.css";

type Tab = "current" | "previous";

/** The order of the service chips (the app's filterKind order); only the services that have a row are drawn. */
const KIND_ORDER: readonly OrderKind[] = ["pharmacy", "consultation", "labs", "radiology", "nursing", "returns"];

export const ORDER_KINDS = KIND_ORDER;

/** The list's own address for a tab and a service: defaults (current, all) are left out. */
export function ordersQuery(path: string, tab: Tab, kind: OrderKind | null): string {
  const params = new URLSearchParams();
  if (tab === "previous") params.set("tab", "previous");
  if (kind) params.set("kind", kind);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Reads ?tab and ?kind from the address; anything unknown is ignored. */
export function parseOrdersQuery(query: { tab?: string | string[]; kind?: string | string[] }): { tab?: Tab; kind: OrderKind | null } {
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const kind = KIND_ORDER.find((value) => value === one(query.kind)) ?? null;
  return { tab: one(query.tab) === "previous" ? "previous" : one(query.tab) === "current" ? "current" : undefined, kind };
}

/**
 * The orders of canvas/Orders, for every service (issue 378): two tabs (current, previous) and one card per order with
 * its title, number or kind, date, status, the price the server stored (pharmacy), and the one action that fits. The
 * rows arrive with their labels already in the reader's language (./center-rows), newest first.
 */
export function OrderList({ locale, rows, partialNote, initialTab, initialKind }: { locale: string; rows: CenterRow[]; partialNote?: string; initialTab?: Tab; initialKind?: OrderKind | null }) {
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
          onChange={(value) => remember(value === "previous" ? "previous" : "current", activeKind)}
          options={[{ value: "current", label: t("tabCurrent") }, { value: "previous", label: t("tabPrevious") }]}
        />
      </div>
      {kinds.length > 1 ? (
        <div className={styles.kindChips} role="group" aria-label={t("filterLabel")}>
          <Chip label={t("filterAll")} selected={activeKind === null} onClick={() => remember(tab, null)} />
          {kinds.map((value) => (
            <Chip key={value} label={t(`filterKind.${value}`)} selected={activeKind === value} onClick={() => remember(tab, value)} />
          ))}
        </div>
      ) : null}
      {shown.length === 0 ? (
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
