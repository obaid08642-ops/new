"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getStableDeviceId } from "@/lib/auth/device-id";
import styles from "./auth/auth.module.css";

type Props = { locale: string };

declare global {
  interface Window { google?: any; apple?: any }
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

/**
 * Real social + guest sign-in for the web patient app.
 * Google renders only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured, and
 * exchanges the OAuth access token with the backend (which verifies it against
 * Google's userinfo endpoint). Guest sign-in is always available and reuses this
 * browser's guest account (one stable device id), landing on Home like /welcome does.
 */
export function SocialLoginButtons({ locale }: Props) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const tokenClient = useRef<any>(null);
  const failedMessage = t("unavailable");
  const googleMessage = t("googleUnavailable");

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        if (cancelled || !window.google?.accounts?.oauth2) return;
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (response: any) => {
            if (!response?.access_token) { setError(failedMessage); setBusy(null); return; }
            try {
              const res = await fetch("/api/auth/social-login", {
                method: "POST",
                headers: { "content-type": "application/json", "x-nabd-device-id": getStableDeviceId() },
                body: JSON.stringify({ provider: "google", token: response.access_token }),
              });
              if (!res.ok) throw new Error("social_failed");
              router.replace(`/${locale}/dashboard`); router.refresh();
            } catch { setError(failedMessage); } finally { setBusy(null); }
          },
          // The popup was closed, blocked or could not open: the buttons must come back.
          error_callback: (failure: { type?: string } | undefined) => {
            setBusy(null);
            if (failure?.type !== "popup_closed") setError(googleMessage);
          },
        });
      })
      .catch(() => { if (!cancelled) setError(googleMessage); });
    return () => { cancelled = true; };
  }, [googleClientId, locale, failedMessage, googleMessage, router]);

  function googleLogin() {
    setError(null);
    // The script has not loaded (offline, blocked): say so instead of leaving the buttons disabled.
    if (!tokenClient.current) { setError(googleMessage); return; }
    setBusy("google");
    try { tokenClient.current.requestAccessToken(); } catch { setBusy(null); setError(googleMessage); }
  }

  async function guestLogin() {
    if (busy) return;
    setBusy("guest"); setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": getStableDeviceId() } });
      if (!res.ok) throw new Error("guest_failed");
      router.replace(`/${locale}`); router.refresh();
    } catch { setError(failedMessage); setBusy(null); }
  }

  return <>
    {googleClientId ? <>
      <div className={styles.divider}>{t("orContinueWith")}</div>
      <div className={styles.social} aria-label={t("otherWays")}>
        <button type="button" className={styles.socialButton} disabled={busy !== null} onClick={googleLogin}>Google</button>
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
