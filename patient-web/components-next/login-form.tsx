"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
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
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(responseMessage(response.status, twoFactor ? t("twoFactorUnavailable") : t("unavailable"), twoFactor ? t("twoFactorInvalid") : t("invalid"))); return; }
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setMessage(twoFactor ? t("twoFactorUnavailable") : t("unavailable")); }
    finally { setSubmitting(false); }
  }

  function responseMessage(status: number, unavailable: string, invalid: string) { return status === 503 || status === 504 ? unavailable : invalid; }

  const ar = locale === "ar";
  const submitLabel = submitting ? (twoFactor ? t("twoFactorSubmitting") : t("submitting")) : (twoFactor ? t("twoFactorSubmit") : t("submit"));

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={submitting} noValidate={false}>
      <label className={styles.field}>
        <span className={styles.label}>{t("identifier")}</span>
        <span className={styles.control}>
          <input required dir="ltr" autoComplete="username" inputMode="email" placeholder="name@example.com" value={identifier} disabled={twoFactor} onChange={(event) => setIdentifier(event.target.value)} />
        </span>
      </label>
      {!twoFactor ? <div className={styles.field}>
        <div className={styles.labelRow}><label className={styles.label} htmlFor="login-password">{t("password")}</label><button type="button" className={`${styles.link} ${styles.forgotTop}`} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</button></div>
        <span className={styles.control}>
          <input id="login-password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className={styles.eye} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}>
            <Icon name={showPassword ? "eye-slash" : "eye"} size={20} tone="currentColor" />
          </button>
        </span>
      </div> : null}
      {twoFactor ? <label className={styles.field}>
        <span className={styles.label}>{t("twoFactorCode")}</span>
        <span className={styles.control}><input required dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></span>
      </label> : null}
      {twoFactor ? <p className={styles.note}>{t("twoFactorTitle")}</p> : null}
      <div className={`${styles.links} ${styles.forgotBelow}`}>
        <button type="button" className={styles.link} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</button>
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
