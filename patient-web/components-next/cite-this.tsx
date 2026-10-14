"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./cite-this.module.css";

/**
 * "Cite this information": a plain-text citation built from REAL page data (title, canonical URL, author, publish
 * date), with a copy button. No fabricated facts. (The citation-manager format that used to sit beside it is
 * technical wording for a patient screen; the page's structured data already carries the same fields.)
 */
export function CiteThis({ title, uri, author, publishedAt, locale }: {
  title: string;
  uri: string;
  author?: string | null;
  authorTitle?: string | null;
  publishedAt?: string | null;
  locale: string;
}) {
  const t = useTranslations("PharmacyBrowse");
  const [copied, setCopied] = useState(false);
  // Decode for human display: a reader should not see %8B%9A.
  let displayUri = uri;
  try { displayUri = decodeURIComponent(uri); } catch { /* keep the encoded form */ }
  const date = publishedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(publishedAt)) : null;
  const plain = `${author ? `${author}. ` : ""}“${title}.” Nabd Plus${date ? `, ${date}` : ""}. ${displayUri}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable: the text stays selectable */ }
  };
  return (
    <section aria-label={t("citeTitle")} className={styles.cite}>
      <h2 className={styles.title}>{t("citeTitle")}</h2>
      <p className={styles.text}>{plain}</p>
      <button type="button" onClick={copy} className={styles.copy}>{copied ? t("citeCopied") : t("citeCopy")}</button>
    </section>
  );
}
