"use client";

import { useEffect, useState } from "react";
import styles from "./consult.module.css";

/**
 * The board's date tile (canvas/Appointments): the day over the month, in the reader's own time zone and locale. It is
 * written after the page is on screen, for the reason `orders/local-date.tsx` gives: on the server the instant would
 * be written in the server's zone. The machine value stays in the markup.
 */
export function LocalTile({ iso, locale, tone }: { iso: string; locale: string; tone: string }) {
  const [parts, setParts] = useState<{ day: string; month: string } | null>(null);
  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) { setParts(null); return; }
    setParts({
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date),
      month: new Intl.DateTimeFormat(locale, { month: "short" }).format(date),
    });
  }, [iso, locale]);
  return (
    <time dateTime={iso} className={`${styles.tile} nabd-tone--${tone}`}>
      <span className={styles.tileDay}>{parts?.day ?? ""}</span>
      <span className={styles.tileMonth}>{parts?.month ?? ""}</span>
    </time>
  );
}
