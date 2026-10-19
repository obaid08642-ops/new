"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./article-share.module.css";

/**
 * 17.4: share an article by its canonical address (the page's own URL, never a tracking or session link). The copy
 * button says so for two seconds; WhatsApp and X open their own share pages in a new tab. Labels come from the caller.
 */
export function ArticleShare({ url, title, labels }: {
  url: string;
  title: string;
  labels: { heading: string; copy: string; copied: string; whatsapp: string; x: string };
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const text = encodeURIComponent(`${title} ${url}`);
  const shareUrl = encodeURIComponent(url);
  return (
    <section className={styles.share} aria-label={labels.heading}>
      <h2 className={styles.heading}>{labels.heading}</h2>
      <ul className={styles.list}>
        <li><button type="button" className={styles.link} onClick={() => void copy()}>{copied ? labels.copied : labels.copy}</button></li>
        <li><a className={styles.link} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">{labels.whatsapp}</a></li>
        <li><a className={styles.link} href={`https://x.com/intent/post?url=${shareUrl}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">{labels.x}</a></li>
      </ul>
    </section>
  );
}
