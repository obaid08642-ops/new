"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { LocalDate } from "@/components-next/orders/local-date";
import { parseOrderRows } from "@/lib/pharmacy/order-view";
import { getSessionIdentity } from "@/lib/auth/session-identity";
import { PHARMACY_TONE } from "./tones";
import styles from "./pharmacy.module.css";

type Last = { id: string; count: number; at?: string };

/**
 * "Order again" of the pharmacy hub (the app's hub card): the patient's latest real pharmacy order, asked for only here in
 * the browser (the catalogue page is the same cached page for everyone). A visitor who is not signed in is never asked
 * (no request that can only answer 401), and an unreadable answer draws nothing.
 */
/** The patient's latest order with items, or null: not signed in (or a guest) is never asked, and any failure is "nothing to show". */
export async function readLatestOrder(): Promise<Last | null> {
  try {
    const who = await getSessionIdentity();
    if (who.status !== "user" || who.isGuest) return null;
    const response = await fetch("/api/patient/patient/pharmacy/orders", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return null;
    const rows = parseOrderRows(await response.json().catch(() => null))
      .filter((row) => (row.itemCount ?? 0) > 0)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const latest = rows[0];
    return latest ? { id: latest.id, count: latest.itemCount ?? 0, at: latest.createdAt } : null;
  } catch {
    return null;
  }
}

export function OrderAgainCard({ locale }: { locale: string }) {
  const t = useTranslations("HomeWeb");
  const [last, setLast] = useState<Last | null>(null);

  useEffect(() => {
    let live = true;
    void readLatestOrder().then((latest) => { if (live && latest) setLast(latest); });
    return () => { live = false; };
  }, []);

  if (!last) return null;
  return (
    <Link className={styles.row} href={`/${locale}/pharmacy/reorder?orderId=${encodeURIComponent(last.id)}`} data-testid="hub-order-again">
      <span className={styles.rowMedia}><FIcon icon="clock-counter-clockwise" tone={PHARMACY_TONE} size={44} /></span>
      <span className={styles.rowBody}>
        <span className={styles.rowName}>{t("orderAgain")}</span>
        <span className={styles.rowSub}>
          {last.count === 1 ? t("orderAgainOneItem") : t("orderAgainItems", { n: last.count })}
          {last.at ? <> · <LocalDate iso={last.at} locale={locale} /></> : null}
        </span>
      </span>
      <span className={styles.rowEnd}>{t("orderAgainAction")}</span>
    </Link>
  );
}
