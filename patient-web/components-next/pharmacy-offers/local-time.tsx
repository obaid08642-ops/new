"use client";

import { useEffect, useState } from "react";
import { formatWhen } from "./format";

/**
 * A time as the reader's own device writes it: formatted after the page is on screen, in the reader's time zone and
 * with the browser's own locale data. Done on the server, the same instant would be written in the server's time
 * zone, and Node's and the browser's date data differ in places (Hindi month names), which breaks hydration.
 * `dateTime` carries the machine value for the server render and for assistive technology.
 */
export function LocalTime({ iso, locale, className }: { iso: string; locale: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => { setText(formatWhen(locale, iso)); }, [iso, locale]);
  return <time dateTime={iso} className={className}>{text ?? ""}</time>;
}
