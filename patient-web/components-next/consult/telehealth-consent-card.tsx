"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { TelehealthConsentText } from "@/lib/legal/telehealth-consent";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";
import legal from "@/components-next/landing/landing.module.css";
import type { LegalBlock } from "@/lib/legal/parse-legal";

export const TELEHEALTH_CONSENT_REQUIRED = "telehealth_consent_required";

/** Whether a booking or call refusal is the server asking for the telehealth consent (D-38). */
export function needsTelehealthConsent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const { message, code } = payload as { message?: unknown; code?: unknown };
  return [message, code].some((value) => typeof value === "string" && value.includes(TELEHEALTH_CONSENT_REQUIRED));
}

type Group = { kind: "heading" | "paragraph"; text: string } | { kind: "bullets"; items: string[] };

/** Consecutive bullets become one list, as on the legal pages (components-next/landing/legal-document.tsx). */
function groupBlocks(blocks: LegalBlock[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (block.kind !== "bullet") groups.push({ kind: block.kind, text: block.text });
    else if (last && last.kind === "bullets") last.items.push(block.text);
    else groups.push({ kind: "bullets", items: [block.text] });
  }
  return groups;
}

/**
 * D-38: the telehealth consent before the first online consultation. It shows the current text (or links the full page
 * when the text could not be read here), and "I agree" records the acceptance through the site (POST
 * /api/legal/accept/telehealth_consent: version, time and device). The booking goes on only after `onAccepted`.
 */
export function TelehealthConsentCard({ locale, consent, onAccepted }: { locale: string; consent: TelehealthConsentText | null; onAccepted: () => void }) {
  const t = useTranslations("TelehealthConsent");
  const [state, setState] = useState<"idle" | "saving" | "failed" | "session">("idle");

  async function accept() {
    if (state === "saving") return;
    setState("saving");
    try {
      const response = await fetch("/api/legal/accept/telehealth_consent", { method: "POST", headers: { "content-type": "application/json" }, body: "{}", credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { setState("session"); return; }
      if (!response.ok) { setState("failed"); return; }
      setState("idle");
      onAccepted();
    } catch {
      setState("failed");
    }
  }

  return (
    <section className={rx.card} aria-labelledby="telehealth-consent-title" data-testid="telehealth-consent">
      <h2 id="telehealth-consent-title" className={styles.sectionTitle}>{t("title")}</h2>
      <p className={`${styles.body} ${styles.muted}`}>{t("intro")}</p>
      {consent ? (
        <div className={styles.consentText} lang={consent.lang} dir={consent.lang === "ar" ? "rtl" : "ltr"} tabIndex={0} aria-label={t("textLabel")}>
          {groupBlocks(consent.blocks).map((group, index) =>
            group.kind === "heading" ? <h3 key={index} className={styles.consentHeading}>{group.text}</h3>
              : group.kind === "bullets" ? (
                <ul key={index} className={legal.legalBullets}>{group.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
              ) : <p key={index} className={legal.legalText}>{group.text}</p>,
          )}
        </div>
      ) : null}
      {consent?.version ? <p className={rx.note}>{t("version", { version: consent.version })}</p> : null}
      <Link className={rx.textLink} href={`/${locale}/telehealth-consent`} target="_blank" rel="noopener">{t("readFull")}</Link>
      {state === "failed" ? <p className={styles.error} role="alert">{t("failed")}</p> : null}
      {state === "session" ? (
        <p className={styles.error} role="alert">
          {t("sessionEnded")} <Link className={rx.textLink} href={`/${locale}/login`}>{t("signIn")}</Link>
        </p>
      ) : null}
      <Button fullWidth label={state === "saving" ? t("accepting") : t("accept")} loading={state === "saving"} onClick={() => void accept()} />
    </section>
  );
}
