"use client";

import { useEffect, useRef } from "react";
import styles from "./toast.module.css";

/**
 * 17.2: a short confirmation that something was done (an address removed, a number copied). It is a polite live region, so a
 * screen reader hears it without the focus moving; it leaves by itself after `ms` and tells the caller so it can clear its message.
 */
export function Toast({ message, onDone, ms = 3000 }: { message: string | null; onDone: () => void; ms?: number }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => done.current(), ms);
    return () => clearTimeout(timer);
  }, [message, ms]);

  if (!message) return null;
  return <div role="status" aria-live="polite" className={styles.toast}>{message}</div>;
}
