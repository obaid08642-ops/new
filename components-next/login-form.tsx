"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter(); const t = useTranslations("Login");
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState("");
  const [twoFactor, setTwoFactor] = useState(false); const [otpMode, setOtpMode] = useState(false); const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      if (otpMode) {
        if (!otpRequested) {
          const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
          if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? t("otpUnavailable") : t("otpRequestInvalid")); return; }
          setOtpRequested(true); setMessage(t("otpSent")); return;
        }
        const verify = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });
        if (!verify.ok) { setMessage(verify.status === 503 || verify.status === 504 ? t("otpUnavailable") : t("otpInvalid")); return; }
        const exchange = await fetch("/api/auth/session/exchange", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });
        if (!exchange.ok) { setMessage(exchange.status === 503 || exchange.status === 504 ? t("otpUnavailable") : t("otpExchangeInvalid")); return; }
        router.replace(`/${locale}/dashboard`); router.refresh(); return;
      }
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? (twoFactor ? t("twoFactorUnavailable") : t("unavailable")) : (twoFactor ? t("twoFactorInvalid") : t("invalid"))); return; }
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setMessage(otpMode ? t("otpUnavailable") : (twoFactor ? t("twoFactorUnavailable") : t("unavailable"))); } finally { setSubmitting(false); }
  }

  function switchMode() { setOtpMode((value) => !value); setOtpRequested(false); setTwoFactor(false); setCode(""); setPassword(""); setMessage(null); }
  const codeStep = otpMode && otpRequested;
  return <form className={styles.form} onSubmit={submit} aria-busy={submitting}>
    <label className={styles.field}><span>{t("identifier")}</span><input required autoComplete="username" value={identifier} disabled={twoFactor || codeStep} onChange={(event) => setIdentifier(event.target.value)} /></label>
    {!otpMode && !twoFactor ? <label className={styles.field}><span>{t("password")}</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : null}
    {twoFactor ? <label className={styles.field}><span>{t("twoFactorCode")}</span><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label> : null}
    {codeStep ? <label className={styles.field}><span>{t("otpCode")}</span><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label> : null}
    {twoFactor ? <p className={styles.description}>{t("twoFactorTitle")}</p> : null}
    {codeStep ? <p className={styles.description}>{t("otpCodeBody")}</p> : null}
    {message ? <p className={styles.error} role="alert">{message}</p> : null}
    <button className={styles.submit} disabled={submitting}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : (otpMode ? <MailCheck size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />)}{submitting ? (otpMode ? t("otpSubmitting") : (twoFactor ? t("twoFactorSubmitting") : t("submitting"))) : (otpMode ? (codeStep ? t("otpVerify") : t("otpRequest")) : (twoFactor ? t("twoFactorSubmit") : t("submit")))}</button>
    <button type="button" className={styles.modeSwitch} onClick={switchMode} disabled={submitting}>{otpMode ? t("usePassword") : t("useOtp")}</button>
  </form>;
}
