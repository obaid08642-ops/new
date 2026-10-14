"use client";

import { useEffect, useState } from "react";

/**
 * Dates and times of an order as the reader's own device writes them, after the page is on screen (the same reason as
 * pharmacy-offers/local-time.tsx: on the server the instant would be written in the server's time zone, and Node's date
 * data differs from the browser's). `dateTime` carries the machine value for the server render and assistive technology.
 */
function format(locale: string, iso: string, style: "date" | "arrival"): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (style === "date") return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
  const now = new Date();
  const today = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  // the board draws an arrival as a time ("[الوقت]"); on another day the date comes with it
  return today
    ? new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(date)
    : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Local({ iso, locale, style, className }: { iso: string; locale: string; style: "date" | "arrival"; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => { setText(format(locale, iso, style)); }, [iso, locale, style]);
  return <time dateTime={iso} className={className}>{text ?? ""}</time>;
}

export const LocalDate = (props: { iso: string; locale: string; className?: string }) => <Local {...props} style="date" />;
export const LocalArrival = (props: { iso: string; locale: string; className?: string }) => <Local {...props} style="arrival" />;
