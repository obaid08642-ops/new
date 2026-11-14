"use client";

import { useTranslations } from "next-intl";
import { providerLinks } from "@/lib/auth/provider-links";
import styles from "./auth.module.css";

/** Shown when a doctor, pharmacy, lab ... account signs in on the patient site: they use the provider app. No patient session was created. */
export function WrongAppNotice({ onBack }: { onBack: () => void }) {
  const t = useTranslations("Login");
  const links = providerLinks();
  const items = [
    { href: links.ios, label: t("wrongAppIos") },
    { href: links.android, label: t("wrongAppAndroid") },
    { href: links.web, label: t("wrongAppWeb") },
  ].filter((item): item is { href: string; label: string } => item.href !== null);
  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("wrongAppTitle")}</h1>
      <p className={styles.subtitle}>{t("wrongAppBody")}</p>
    </div>
    <div className={styles.actions} role="status">
      {items.map((item) => (
        <a key={item.href} className={styles.socialButton} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
      ))}
      <button type="button" className={styles.link} onClick={onBack}>{t("wrongAppBack")}</button>
    </div>
  </>;
}
