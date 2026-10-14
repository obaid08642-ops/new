"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { authErrorKind } from "@/lib/auth/auth-errors";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

/** An unknown or expired code (the backend answers 401 reset_token_invalid) says so; any other failure is the generic one. */
export function resetErrorMessage(t: (key: string) => string, status: number): string {
  return authErrorKind(status) === "unauthorized" ? t("invalidToken") : t("failed");
}

export function PasswordResetForm({ locale }: { locale: Locale }) {
  const t = useTranslations("PasswordReset");
  const router = useRouter();
  const [resetToken, setToken] = useState("");
  const [newPassword, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [expired, setExpired] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setExpired(false);
    if (newPassword !== confirm) { setOk(false); setMessage(t("mismatch")); return; }
    if (resetToken.trim().length < 1 || newPassword.length < 8) { setOk(false); setMessage(t("failed")); return; }
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/auth/password/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reset_token: resetToken.trim(), new_password: newPassword }) });
      if (!response.ok) {
        setOk(false); setExpired(authErrorKind(response.status) === "unauthorized");
        setMessage(resetErrorMessage(t, response.status));
        return;
      }
      setOk(true); setMessage(t("success")); setToken(""); setPassword(""); setConfirm("");
    } catch { setOk(false); setMessage(t("failed")); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <label className={styles.field}>
        <span className={styles.label}>{t("token")}</span>
        {/* The reset token is a long mixed-case string, not digits: plain text input, no number pad, no autocapitalise. */}
        <span className={styles.control}><input required dir="ltr" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={resetToken} onChange={(event) => setToken(event.target.value)} /></span>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{t("password")}</span>
        <span className={styles.control}><input required minLength={8} type="password" value={newPassword} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></span>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{t("confirm")}</span>
        <span className={styles.control}><input required minLength={8} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></span>
      </label>
      {message ? <p className={ok ? styles.note : styles.error} role={ok ? "status" : "alert"}>{message}</p> : null}
      {expired ? <p className={styles.foot}><Link className={styles.link} href={`/${locale}/forgot-password`}>{t("requestNew")}</Link></p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={busy ? t("busy") : t("submit")} loading={busy} />
        <p className={styles.foot}><button type="button" className={styles.link} onClick={() => router.push(`/${locale}/login`)}>{t("back")}</button></p>
      </div>
    </form>
  </>;
}
