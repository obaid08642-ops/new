"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { authErrorKind } from "@/lib/auth/auth-errors";
import { announceSignedIn } from "@/lib/auth/session-identity";
import { safeNextPath } from "@/lib/auth/safe-next";
import { afterFailure, minutesLeft, readLock, writeLock } from "@/lib/auth/login-lockout";
import { codeRequestFailure, usableIdentifier } from "@/lib/auth/otp-flow";
import type { Locale } from "@/lib/i18n";
import { WrongAppNotice } from "./auth/wrong-app-notice";
import { SocialLoginButtons } from "./social-login-buttons";
import type { SocialButtons } from "@/lib/auth/social-config";
import styles from "./auth/auth.module.css";

type Translate = (key: string) => string;

/** The message for a failed sign-in or code step, by what the HTTP status means (not every failure is "wrong details"). */
export function loginErrorMessage(t: Translate, status: number, twoFactor: boolean): string {
  switch (authErrorKind(status)) {
    case "rateLimited": return t("rateLimited");
    case "forbidden": return t("forbidden");
    case "unavailable": return twoFactor ? t("twoFactorUnavailable") : t("unavailable");
    case "server": return twoFactor ? t("twoFactorUnavailable") : t("serverError");
    case "badRequest": return twoFactor ? t("twoFactorInvalid") : t("checkDetails");
    default: return twoFactor ? t("twoFactorInvalid") : t("invalid");
  }
}

export function LoginForm({ locale, guestBlocked = false, social = {} }: { locale: Locale; guestBlocked?: boolean; social?: SocialButtons }) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [message, setMessage] = useState<string | null>(guestBlocked ? t("guestBlocked") : null);
  const [submitting, setSubmitting] = useState(false);
  const [wrongApp, setWrongApp] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const locked = minutesLeft(readLock(), Date.now());
    if (!twoFactor && locked > 0) { setMessage(t("locked", { minutes: locked })); return; }
    // The form is noValidate: the browser's own "required" bubble is the only feedback otherwise, and many readers never see it.
    if (!twoFactor && (identifier.trim().length < 3 || !password)) { setMessage(t("checkDetails")); return; }
    if (twoFactor && code.trim().length < 6) { setMessage(t("twoFactorInvalid")); return; }
    setSubmitting(true);
    try {
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 403 && payload?.message === "wrong_app") { setWrongApp(true); setPassword(""); setCode(""); return; }
        if (!twoFactor && response.status === 401) {
          const next = afterFailure(readLock(), Date.now()); writeLock(next);
          const left = minutesLeft(next, Date.now());
          if (left > 0) { setMessage(t("locked", { minutes: left })); return; }
        }
        setMessage(loginErrorMessage(t, response.status, twoFactor)); return;
      }
      writeLock({ fails: 0, lockedUntil: 0 });
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      announceSignedIn();
      // Back to the page that asked for a sign-in (for example the checkout), never outside this site.
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next ?? `/${locale}/dashboard`); router.refresh();
    } catch { setMessage(twoFactor ? t("twoFactorUnavailable") : t("unavailable")); }
    finally { setSubmitting(false); }
  }

  // Sign in with a code: the same /api/auth/otp/request the sign-up uses (it answers the same whether or not the account exists),
  // then the /otp screen, which reads where the code went from the cookie that route sets.
  async function signInWithCode() {
    setMessage(null);
    const target = usableIdentifier(identifier);
    if (!target) { setMessage(t("codeIdentifier")); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: target }) });
      if (response.ok) { router.push(`/${locale}/otp`); return; }
      const body = await response.json().catch(() => null);
      const failure = codeRequestFailure(response.status, body);
      setMessage(failure === "noChannel" ? t("codeNoChannel") : failure === "rateLimited" ? t("rateLimited") : t("unavailable"));
    } catch { setMessage(t("unavailable")); }
    finally { setSubmitting(false); }
  }

  const submitLabel = submitting ? (twoFactor ? t("twoFactorSubmitting") : t("submitting")) : (twoFactor ? t("twoFactorSubmit") : t("submit"));
  const forgot = <button type="button" className={`${styles.link} ${styles.forgotTop}`} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{t("forgotPassword")}</button>;

  if (wrongApp) return <WrongAppNotice onBack={() => { setWrongApp(false); setTwoFactor(false); setMessage(null); }} />;

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={submitting} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>{t("identifier")}</span>
        <span className={styles.control}>
          <input required aria-describedby={message ? "login-message" : undefined} aria-invalid={Boolean(message) && !twoFactor && identifier.trim().length < 3} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} value={identifier} disabled={twoFactor} onChange={(event) => setIdentifier(event.target.value)} />
        </span>
      </label>
      {!twoFactor ? <div className={styles.field}>
        <div className={styles.labelRow}><label className={styles.label} htmlFor="login-password">{t("password")}</label>{forgot}</div>
        <span className={styles.control}>
          <input id="login-password" required aria-describedby={message ? "login-message" : undefined} aria-invalid={Boolean(message) && !password} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button type="button" className={styles.eye} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("hidePassword") : t("showPassword")}>
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
        <button type="button" className={styles.link} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{t("forgotPassword")}</button>
      </div>
      {message ? <p id="login-message" className={styles.error} role="alert">{message}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={submitLabel} loading={submitting} />
        {!twoFactor ? <p className={styles.foot}><button type="button" className={styles.link} onClick={signInWithCode} disabled={submitting}>{t("codeSignIn")}</button></p> : null}
        <SocialLoginButtons locale={locale} social={social} onWrongApp={() => setWrongApp(true)} />
        <p className={styles.legal}>{t.rich("legal", {
          terms: (chunks) => <Link href={`/${locale}/terms`}>{chunks}</Link>,
          privacy: (chunks) => <Link href={`/${locale}/privacy`}>{chunks}</Link>,
        })}</p>
      </div>
    </form>
  </>;
}
