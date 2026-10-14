"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { authErrorKind } from "@/lib/auth/auth-errors";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

/** Why the recovery request failed: too many requests is not "could not send". */
export function forgotErrorMessage(t: (key: string) => string, status: number): string {
  return authErrorKind(status) === "rateLimited" ? t("limited") : t("failed");
}

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations("ForgotPassword");
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (identifier.trim().length < 3) { setSent(false); setMessage(t("failed")); return; }
    setBusy(true); setMessage(null); setSent(false);
    try {
      const response = await fetch("/api/auth/password/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
      setSent(response.ok);
      setMessage(response.ok ? t("success") : forgotErrorMessage(t, response.status));
    } catch { setMessage(t("failed")); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <label className={styles.field}>
        <span className={styles.label}>{t("identifier")}</span>
        <span className={styles.control}><input required dir="ltr" autoCapitalize="none" spellCheck={false} value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" /></span>
      </label>
      {message ? <p className={sent ? styles.note : styles.error} role={sent ? "status" : "alert"}>{message}</p> : null}
      {sent ? <p className={styles.foot}><Link className={styles.link} href={`/${locale}/password-reset`}>{t("nextStep")}</Link></p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={busy ? t("busy") : t("submit")} loading={busy} />
        <p className={styles.foot}><button type="button" className={styles.link} onClick={() => router.push(`/${locale}/login`)}>{t("back")}</button></p>
      </div>
    </form>
  </>;
}
