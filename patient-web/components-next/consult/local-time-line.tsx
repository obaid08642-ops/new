"use client";

import { useEffect, useState } from "react";

/**
 * A date and time as the reader's own device writes it, after the page is on screen (on the server it would be written
 * in the server's zone; see orders/local-date.tsx). `dateStyle` "medium" with a short time is the format the screens used.
 */
export function LocalTimeLine({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    const date = new Date(iso);
    setText(Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date));
  }, [iso, locale]);
  return <time dateTime={iso} className={className}>{text}</time>;
}
