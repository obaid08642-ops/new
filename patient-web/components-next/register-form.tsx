"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { authErrorKind } from "@/lib/auth/auth-errors";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

const policyIds = {
  terms: process.env.NEXT_PUBLIC_TERMS_POLICY_ID || "terms",
  termsVersion: process.env.NEXT_PUBLIC_TERMS_POLICY_VERSION || "v1",
  privacy: process.env.NEXT_PUBLIC_PRIVACY_POLICY_ID || "privacy",
  privacyVersion: process.env.NEXT_PUBLIC_PRIVACY_POLICY_VERSION || "v1",
};

/** What a failed registration means to the person. A 5xx may come AFTER the account was created (the code could not be sent), so it never says "no account was created". */
export function registerErrorMessage(t: (key: string) => string, status: number): string {
  switch (authErrorKind(status)) {
    case "conflict": return t("alreadyRegistered");
    case "rateLimited": return t("rateLimited");
    case "server":
    case "unavailable": return t("incomplete");
    default: return t("invalid");
  }
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = useTranslations("Register");
  const router = useRouter();
  const [form, setForm] = useState({ name: "", identifier: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => r.json().catch(() => null))
      .then((d) => { if (d?.authenticated && d?.user?.is_guest) setIsGuest(true); })
      .catch(() => null);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const consents = [
      { policy_id: policyIds.terms, version: policyIds.termsVersion },
      { policy_id: policyIds.privacy, version: policyIds.privacyVersion },
    ];
    if (form.name.trim().length < 2 || form.identifier.trim().length < 3 || form.password.length < 8 || !agreed) {
      setMessage(t("invalid"));
      return;
    }
    setBusy(true);
    try {
      // Guest with a phone identifier converts (zero-loss merge server-side)
      // instead of opening a second account that orphans guest history.
      const looksPhone = /^[+\d][\d\s-]{6,19}$/.test(form.identifier.trim());
      if (isGuest && looksPhone) {
        setMessage(t("converting"));
        const response = await fetch("/api/auth/convert-guest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ full_name: form.name.trim(), phone: form.identifier.trim(), password: form.password }),
        });
        if (!response.ok) {
          setMessage(registerErrorMessage(t, response.status));
          return;
        }
        setMessage(t("converted"));
        router.push(`/${locale}`);
        return;
      }
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), identifier: form.identifier.trim(), password: form.password, locale, consents }),
      });
      if (!response.ok) {
        setMessage(registerErrorMessage(t, response.status));
        return;
      }
      setMessage(t("success"));
      router.push(`/${locale}/otp`);
    } catch {
      setMessage(t("unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.heading}>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("body")}</p>
      </div>
      <form className={styles.form} onSubmit={submit} aria-busy={busy}>
        <label className={styles.field}>
          <span className={styles.label}>{t("name")}</span>
          <span className={styles.control}><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("identifier")}</span>
          <span className={styles.control}><input required dir="ltr" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoComplete="username" /></span>
          <span className={styles.hint}>{t("hintIdentifier")}</span>
        </label>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-password">{t("password")}</label>
          <span className={styles.control}>
            <input id="register-password" required minLength={8} type={show ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
            <button type="button" className={styles.eye} onClick={() => setShow((v) => !v)} aria-label={show ? t("hidePassword") : t("showPassword")}>
              <Icon name={show ? "eye-slash" : "eye"} size={20} tone="currentColor" />
            </button>
          </span>
          <span className={styles.hint}>{t("hintPassword")}</span>
        </div>
        <label className={styles.consent}>
          <input type="checkbox" className={styles.checkbox} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {t.rich("agree", {
              terms: (chunks) => <Link href={`/${locale}/terms`}>{chunks}</Link>,
              privacy: (chunks) => <Link href={`/${locale}/privacy`}>{chunks}</Link>,
            })}
          </span>
        </label>
        {message ? <p className={styles.error} role="alert">{message}</p> : null}
        {isGuest ? <p className={styles.note} role="note">{t("guestNote")}</p> : null}
        <div className={styles.actions}>
          <Button type="submit" variant="primary" size="lg" fullWidth label={busy ? t("busy") : t("submit")} loading={busy} />
          <p className={styles.foot}><Link className={styles.link} href={`/${locale}/login`}>{t("login")}</Link></p>
        </div>
      </form>
    </>
  );
}
