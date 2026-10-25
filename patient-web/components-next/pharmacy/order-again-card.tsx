"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { LocalDate } from "@/components-next/orders/local-date";
import { useSessionIdentity } from "@/lib/auth/session-identity";
import { parseOrderRows } from "@/lib/pharmacy/order-view";
import { PHARMACY_TONE } from "./tones";
import styles from "./pharmacy.module.css";

type Last = { id: string; count: number; at?: string };

/**
 * "Order again" of the pharmacy hub (the app's hub card): the patient's latest real pharmacy order, asked for only here in
 * the browser (the catalogue page is the same cached page for everyone). A visitor who is not signed in makes no request at all
 * (the session identity decides, never a 401); an unreadable answer draws nothing.
 */
export function OrderAgainCard({ locale }: { locale: string }) {
  const t = useTranslations("PharmacyBrowse");
  const [last, setLast] = useState<Last | null>(null);
  const identity = useSessionIdentity();
  // only a signed-in visitor (the shared session probe / hint cookie) asks for orders; a guest visitor never gets a 401 here
  const signedIn = identity.status === "user";

  useEffect(() => {
    if (!signedIn) return undefined;
    let live = true;
    fetch("/api/patient/patient/pharmacy/orders", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || !live) return;
        const rows = parseOrderRows(await response.json().catch(() => null))
          .filter((row) => (row.itemCount ?? 0) > 0)
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        const latest = rows[0];
        if (latest && live) setLast({ id: latest.id, count: latest.itemCount ?? 0, at: latest.createdAt });
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [signedIn]);

  if (!signedIn || !last) return null;
  return (
    <Link className={styles.row} href={`/${locale}/pharmacy/reorder?orderId=${encodeURIComponent(last.id)}`} data-testid="hub-order-again">
      <span className={styles.rowMedia}><FIcon icon="clock-counter-clockwise" tone={PHARMACY_TONE} size={44} /></span>
      <span className={styles.rowBody}>
        <span className={styles.rowName}>{t("hubOrderAgain")}</span>
        <span className={styles.rowSub}>
          {last.count === 1 ? t("hubOneItem") : t("hubItems", { n: last.count })}
          {last.at ? <> · <LocalDate iso={last.at} locale={locale} /></> : null}
        </span>
      </span>
      <span className={styles.rowEnd}>{t("hubOrderAgainAction")}</span>
    </Link>
  );
}
