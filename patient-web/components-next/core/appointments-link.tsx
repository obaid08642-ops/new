"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { formatNumber } from "@/lib/format-price";
import type { Locale } from "@/lib/i18n";
import styles from "./core.module.css";

/**
 * The "My appointments" button of the consultations header (owner 2026-10-30; it takes the cart's place there). Its badge is the
 * count of visit results the patient has not opened (GET /api/medical-reports/new-count, the server's `viewed_by_patient`
 * flag); a failed or signed-out read draws no badge, never a made-up number.
 */
export function AppointmentsLink({ locale, href, className = "" }: { locale: Locale; href: string; className?: string }) {
  const shell = useTranslations("CoreShell");
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/medical-reports/new-count", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { count?: unknown } | null) => { if (alive) setCount(typeof body?.count === "number" && body.count > 0 ? body.count : 0); })
      .catch(() => { if (alive) setCount(0); });
    return () => { alive = false; };
  }, []);
  return (
    <Link href={href} className={`${styles.iconLink} ${styles.cartLink}${className ? ` ${className}` : ""}`} data-testid="appointments-link" aria-label={count > 0 ? shell("appointmentsNew", { n: count }) : shell("appointments")} title={shell("appointments")}>
      <Icon name="calendar" size={20} tone="currentColor" />
      {count > 0 ? <span className={styles.cartBadge} aria-hidden="true" data-testid="appointments-badge">{formatNumber(locale, count)}</span> : null}
    </Link>
  );
}
