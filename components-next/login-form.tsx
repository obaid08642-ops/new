"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter(); const t = useTranslations("Login");
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState("");
  const [twoFactor, setTwoFactor] = useState(false); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? (twoFactor ? t("twoFactorUnavailable") : t("unavailable")) : (twoFactor ? t("twoFactorInvalid") : t("invalid"))); return; }
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setMessage(twoFactor ? t("twoFactorUnavailable") : t("unavailable")); } finally { setSubmitting(false); }
  }
  return <form className={styles.form} onSubmit={submit} aria-busy={submitting}>
    <label className={styles.field}><span>{t("identifier")}</span><input required autoComplete="username" value={identifier} disabled={twoFactor} onChange={(event) => setIdentifier(event.target.value)} /></label>
    {!twoFactor ? <label className={styles.field}><span>{t("password")}</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <label className={styles.field}><span>{t("twoFactorCode")}</span><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} /></label>}
    {twoFactor ? <p className={styles.description}>{t("twoFactorTitle")}</p> : null}
    {message ? <p className={styles.error} role="alert">{message}</p> : null}
    <button className={styles.submit} disabled={submitting}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}{submitting ? (twoFactor ? t("twoFactorSubmitting") : t("submitting")) : (twoFactor ? t("twoFactorSubmit") : t("submit"))}</button>
  </form>;
}
