"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@/components-next/ui-generated";
import type { Locale } from "@/lib/i18n";
import { SocialLoginButtons } from "./social-login-buttons";
import styles from "./auth/auth.module.css";

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      if (otpMode) {
        if (!otpRequested) {
          const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
          if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? t("otpUnavailable") : t("otpRequestInvalid")); return; }
          setOtpRequested(true); router.push(`/${locale}/otp?identifier=${encodeURIComponent(identifier.trim())}`); return;
        }
        const verify = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });
        if (!verify.ok) { setMessage(responseMessage(verify.status, t("otpUnavailable"), t("otpInvalid"))); return; }
        const exchange = await fetch("/api/auth/session/exchange", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });
        if (!exchange.ok) { setMessage(responseMessage(exchange.status, t("otpUnavailable"), t("otpExchangeInvalid"))); return; }
        router.replace(`/${locale}/dashboard`); router.refresh(); return;
      }
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(responseMessage(response.status, twoFactor ? t("twoFactorUnavailable") : t("unavailable"), twoFactor ? t("twoFactorInvalid") : t("invalid"))); return; }
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setMessage(otpMode ? t("otpUnavailable") : (twoFactor ? t("twoFactorUnavailable") : t("unavailable"))); }
    finally { setSubmitting(false); }
  }

  function responseMessage(status: number, unavailable: string, invalid: string) { return status === 503 || status === 504 ? unavailable : invalid; }
  function switchMode() { setOtpMode((value) => !value); setOtpRequested(false); setTwoFactor(false); setCode(""); setPassword(""); setMessage(null); }
  const codeStep = otpMode && otpRequested;

  const ar = locale === "ar";
  const submitLabel = submitting
    ? (otpMode ? t("otpSubmitting") : (twoFactor ? t("twoFactorSubmitting") : t("submitting")))
    : (otpMode ? (codeStep ? t("otpVerify") : t("otpRequest")) : (twoFactor ? t("twoFactorSubmit") : t("submit")));

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={submitting} noValidate={false}>
      <label className={styles.field}>
        <span className={styles.label}>{t("identifier")}</span>
        <span className={styles.control}>
          <input required dir="ltr" autoComplete="username" inputMode="email" placeholder="name@example.com" value={identifier} disabled={twoFactor || codeStep} onChange={(event) => setIdentifier(event.target.value)} />
        </span>
      </label>
      {!otpMode && !twoFactor ? <div className={styles.field}>
        <label className={styles.label} htmlFor="login-password">{t("password")}</label>
        <span className={styles.control}>
          <input id="login-password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className={styles.eye} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}>
            <Icon name={showPassword ? "eye-slash" : "eye"} size={20} tone="currentColor" />
          </button>
        </span>
      </div> : null}
      {twoFactor || codeStep ? <label className={styles.field}>
        <span className={styles.label}>{twoFactor ? t("twoFactorCode") : t("otpCode")}</span>
        <span className={styles.control}><input required dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></span>
      </label> : null}
      {twoFactor ? <p className={styles.note}>{t("twoFactorTitle")}</p> : null}
      {codeStep ? <p className={styles.note}>{t("otpCodeBody")}</p> : null}
      <div className={styles.links}>
        <button type="button" className={styles.link} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</button>
        <button type="button" className={styles.link} onClick={switchMode} disabled={submitting}>{otpMode ? t("usePassword") : t("useOtp")}</button>
      </div>
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={submitLabel} loading={submitting} />
        <SocialLoginButtons locale={locale} labels={{ guest: t("guestContinue"), guestLoading: t("guestLoading"), error: t("unavailable"), divider: ar ? "أو تابع عبر" : "Or continue with", noAccount: ar ? "ليس لديك حساب؟" : "New to Nabd+?", register: ar ? "إنشاء حساب" : "Create an account" }} />
        <p className={styles.legal}>{ar ? "بالمتابعة أنت توافق على " : "By continuing you agree to the "}<a href={`/${locale}/terms`}>{ar ? "الشروط" : "Terms"}</a>{ar ? " و" : " and "}<a href={`/${locale}/privacy`}>{ar ? "سياسة الخصوصية" : "Privacy Policy"}</a></p>
      </div>
    </form>
  </>;
}
