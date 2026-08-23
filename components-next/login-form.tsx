"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

function NLogo() {
  return <span className={styles.logoMark} aria-hidden="true"><svg viewBox="0 0 100 100" role="presentation"><path d="M18 52H38l5-22 9 44 6-30 5 8H82" /></svg></span>;
}

const socialProviders = [
  { id: "google", label: "Google", className: styles.google },
  { id: "apple", label: "Apple", className: styles.apple },
  { id: "snapchat", label: "Snapchat", className: styles.snapchat },
  { id: "x", label: "X", className: styles.x },
] as const;

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
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

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

  return <div className={styles.shell}>
    <div className={styles.brandHero}><NLogo /><div><span className={styles.brandName}>{locale === "ar" ? "نبض بلس" : "Nabd Plus"}</span><span className={styles.brandTagline}>{locale === "ar" ? "رعايتك أقرب" : "Care, closer"}</span></div></div>
    <form className={styles.form} onSubmit={submit} aria-busy={submitting}>
      <label className={styles.field}><span>{t("identifier")}</span><input required autoComplete="username" value={identifier} disabled={twoFactor || codeStep} onChange={(event) => setIdentifier(event.target.value)} /></label>
      {!otpMode && !twoFactor ? <label className={styles.field}><span>{t("password")}</span><span className={styles.inputWrap}><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className={styles.iconButton} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label> : null}
      {twoFactor || codeStep ? <label className={styles.field}><span>{twoFactor ? t("twoFactorCode") : t("otpCode")}</span><input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label> : null}
      {twoFactor ? <p className={styles.description}>{t("twoFactorTitle")}</p> : null}
      {codeStep ? <p className={styles.description}>{t("otpCodeBody")}</p> : null}
      <div className={styles.utilityRow}><button type="button" className={styles.textLink} onClick={() => setOtpMode(true)} disabled={submitting}>{otpMode ? t("usePassword") : t("useOtp")}</button><button type="button" className={styles.textLink} onClick={() => setMessage(locale === "ar" ? "استعادة كلمة المرور غير مفعلة حتى يثبت مسار العقد." : "Password recovery is unavailable until its contract is verified.")} disabled={submitting}>{locale === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}</button></div>
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <button className={styles.submit} disabled={submitting}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : (otpMode ? <MailCheck size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />)}{submitting ? (otpMode ? t("otpSubmitting") : (twoFactor ? t("twoFactorSubmitting") : t("submitting"))) : (otpMode ? (codeStep ? t("otpVerify") : t("otpRequest")) : (twoFactor ? t("twoFactorSubmit") : t("submit")))}</button>
      <div className={styles.divider}><span>{locale === "ar" ? "أو الدخول بواسطة" : "Or continue with"}</span></div>
      <div className={styles.socialGrid} aria-label={locale === "ar" ? "طرق الدخول الاجتماعي" : "Social sign in options"}>{socialProviders.map((provider) => <button key={provider.id} type="button" className={`${styles.socialButton} ${provider.className}`} onClick={() => setSocialMessage(locale === "ar" ? `تسجيل الدخول عبر ${provider.label} غير متاح حتى تثبيت إعدادات OAuth الآمنة.` : `${provider.label} sign-in is unavailable until secure OAuth configuration is verified.`)} aria-label={provider.label}><span>{provider.id === "google" ? "G" : provider.id === "apple" ? "●" : provider.id === "snapchat" ? "S" : "𝕏"}</span></button>)}</div>
      {socialMessage ? <p className={styles.blocked} role="status">{socialMessage}</p> : null}
      <p className={styles.registerPrompt}>{locale === "ar" ? "ليس لديك حساب؟" : "New to Nabd Plus?"} <button type="button" className={styles.textLink} onClick={() => router.push(`/${locale}/register`)}>{locale === "ar" ? "سجل الآن" : "Create an account"}</button></p>
    </form>
  </div>;
}
