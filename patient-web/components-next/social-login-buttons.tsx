"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getStableDeviceId } from "@/lib/auth/device-id";
import { announceSignedIn } from "@/lib/auth/session-identity";
import styles from "./auth/auth.module.css";

type Props = { locale: string; onWrongApp?: () => void };

declare global {
  interface Window { AppleID?: { auth: { init(config: Record<string, unknown>): void; signIn(): Promise<{ authorization?: { id_token?: string }; user?: { email?: string; name?: { firstName?: string; lastName?: string } } }> } } }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src; el.async = true; el.defer = true;
    el.onload = () => resolve(); el.onerror = () => reject(new Error("script_load_failed"));
    document.head.appendChild(el);
  });
}

const APPLE_SDK = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/**
 * Guest sign-in is always available. The only social sign-in on the web is Apple (owner decision 2026-10-24: X, Snapchat
 * and Google are not offered); its button renders only when NEXT_PUBLIC_APPLE_CLIENT_ID (the Services ID) and
 * NEXT_PUBLIC_APPLE_REDIRECT_URI are configured, and the identity token goes to the backend, which verifies it.
 */
export function SocialLoginButtons({ locale, onWrongApp }: Props) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "";
  const appleRedirect = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || "";
  const configured = Boolean(appleClientId && appleRedirect);
  const failedMessage = t("unavailable");
  const appleMessage = t("appleUnavailable");

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    loadScript(APPLE_SDK)
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({ clientId: appleClientId, scope: "name email", redirectURI: appleRedirect, usePopup: true });
        setReady(true);
      })
      .catch(() => { if (!cancelled) setError(appleMessage); });
    return () => { cancelled = true; };
  }, [configured, appleClientId, appleRedirect, appleMessage]);

  async function appleLogin() {
    if (busy) return;
    setError(null);
    if (!ready || !window.AppleID) { setError(appleMessage); return; }
    setBusy("apple");
    try {
      const result = await window.AppleID.auth.signIn();
      const token = result.authorization?.id_token;
      if (!token) throw new Error("apple_no_token");
      const name = [result.user?.name?.firstName, result.user?.name?.lastName].filter(Boolean).join(" ");
      const res = await fetch("/api/auth/social-login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nabd-device-id": getStableDeviceId() },
        body: JSON.stringify({ provider: "apple", token, ...(result.user?.email ? { email: result.user.email } : {}), ...(name ? { name } : {}) }),
      });
      if (res.status === 403 && (await res.json().catch(() => null))?.message === "wrong_app") { onWrongApp?.(); return; }
      if (!res.ok) throw new Error("social_failed");
      announceSignedIn();
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch (failure) {
      // Closing the Apple popup is a choice, not an error.
      const code = (failure as { error?: string } | null)?.error;
      if (code !== "popup_closed_by_user" && code !== "user_cancelled_authorize") setError(failedMessage);
    } finally { setBusy(null); }
  }

  async function guestLogin() {
    if (busy) return;
    setBusy("guest"); setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": getStableDeviceId() } });
      if (!res.ok) throw new Error("guest_failed");
      announceSignedIn();
      router.replace(`/${locale}`); router.refresh();
    } catch { setError(failedMessage); setBusy(null); }
  }

  return <>
    {configured ? <>
      <div className={styles.divider}>{t("orContinueWith")}</div>
      <div className={styles.social} aria-label={t("otherWays")}>
        <button type="button" className={styles.socialButton} disabled={busy !== null} onClick={appleLogin}>{t("apple")}</button>
      </div>
    </> : null}
    <div className={styles.foot}>
      <span>{t("noAccount")} <Link className={styles.link} href={`/${locale}/register`}>{t("createAccount")}</Link></span>
      <button type="button" className={`${styles.link} ${styles.guest}`} onClick={guestLogin} disabled={busy !== null}>
        {busy === "guest" ? t("guestLoading") : t("guestContinue")}
      </button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </>;
}
