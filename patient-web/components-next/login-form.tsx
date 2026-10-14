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
import type { Locale } from "@/lib/i18n";
import { SocialLoginButtons } from "./social-login-buttons";
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

export function LoginForm({ locale, guestBlocked = false }: { locale: Locale; guestBlocked?: boolean }) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [message, setMessage] = useState<string | null>(guestBlocked ? t("guestBlocked") : null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setSubmitting(true);
    try {
      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
      const body = twoFactor ? { identifier, code } : { identifier, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(loginErrorMessage(t, response.status, twoFactor)); return; }
      if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }
      announceSignedIn();
      // Back to the page that asked for a sign-in (for example the checkout), never outside this site.
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next ?? `/${locale}/dashboard`); router.refresh();
    } catch { setMessage(twoFactor ? t("twoFactorUnavailable") : t("unavailable")); }
    finally { setSubmitting(false); }
  }

  const submitLabel = submitting ? (twoFactor ? t("twoFactorSubmitting") : t("submitting")) : (twoFactor ? t("twoFactorSubmit") : t("submit"));
  const forgot = <button type="button" className={`${styles.link} ${styles.forgotTop}`} onClick={() => router.push(`/${locale}/forgot-password`)} disabled={submitting}>{t("forgotPassword")}</button>;

  return <>
    <div className={styles.heading}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.subtitle}>{t("body")}</p>
    </div>
    <form className={styles.form} onSubmit={submit} aria-busy={submitting} noValidate={false}>
      <label className={styles.field}>
        <span className={styles.label}>{t("identifier")}</span>
        <span className={styles.control}>
          <input required dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} value={identifier} disabled={twoFactor} onChange={(event) => setIdentifier(event.target.value)} />
        </span>
      </label>
      {!twoFactor ? <div className={styles.field}>
        <div className={styles.labelRow}><label className={styles.label} htmlFor="login-password">{t("password")}</label>{forgot}</div>
        <span className={styles.control}>
          <input id="login-password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
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
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <div className={styles.actions}>
        <Button type="submit" variant="primary" size="lg" fullWidth label={submitLabel} loading={submitting} />
        <SocialLoginButtons locale={locale} />
        <p className={styles.legal}>{t.rich("legal", {
          terms: (chunks) => <Link href={`/${locale}/terms`}>{chunks}</Link>,
          privacy: (chunks) => <Link href={`/${locale}/privacy`}>{chunks}</Link>,
        })}</p>
      </div>
    </form>
  </>;
}
