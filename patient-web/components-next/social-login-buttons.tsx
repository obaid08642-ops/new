"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getStableDeviceId } from "@/lib/auth/device-id";
import { announceSignedIn } from "@/lib/auth/session-identity";
import styles from "./auth/auth.module.css";

type Props = { locale: string };

declare global {
  interface Window { google?: any; apple?: any; AppleID?: any }
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

const APPLE_JS = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

/**
 * Real social + guest sign-in for the web patient app.
 * Apple renders only when NEXT_PUBLIC_APPLE_CLIENT_ID (the Services ID) is configured; Sign in with Apple JS opens
 * Apple's popup, and the identity token it returns is verified by the backend (APPLE_SIGNIN_CLIENT_IDS must list that
 * Services ID). X and Snapchat have no web sign-in: the backend refuses them, so no button is drawn.
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
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "";
  const tokenClient = useRef<any>(null);
  const appleReady = useRef(false);
  const appleMessage = t("appleUnavailable");
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
              announceSignedIn();
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

  useEffect(() => {
    if (!appleClientId) return;
    let cancelled = false;
    loadScript(APPLE_JS)
      .then(() => {
        if (cancelled || !window.AppleID?.auth) return;
        window.AppleID.auth.init({
          clientId: appleClientId,
          scope: "name email",
          // Must be one of the return URLs registered for the Services ID at Apple; popup mode never navigates to it.
          redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || window.location.origin,
          state: Math.random().toString(36).slice(2),
          usePopup: true,
        });
        appleReady.current = true;
      })
      .catch(() => { if (!cancelled) setError(appleMessage); });
    return () => { cancelled = true; };
  }, [appleClientId, appleMessage]);

  async function appleLogin() {
    setError(null);
    if (!appleReady.current || !window.AppleID?.auth) { setError(appleMessage); return; }
    setBusy("apple");
    try {
      const result = await window.AppleID.auth.signIn();
      const idToken = result?.authorization?.id_token;
      if (!idToken) throw new Error("apple_no_token");
      const name = [result?.user?.name?.firstName, result?.user?.name?.lastName].filter(Boolean).join(" ");
      const res = await fetch("/api/auth/social-login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-nabd-device-id": getStableDeviceId() },
        body: JSON.stringify({ provider: "apple", token: idToken, ...(name ? { name } : {}) }),
      });
      if (!res.ok) throw new Error("social_failed");
      announceSignedIn();
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch (failure: any) {
      // Closing Apple's popup is a choice, not an error.
      if (failure?.error !== "popup_closed_by_user" && failure?.error !== "user_cancelled_authorize") setError(failedMessage);
    } finally { setBusy(null); }
  }

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
      announceSignedIn();
      router.replace(`/${locale}`); router.refresh();
    } catch { setError(failedMessage); setBusy(null); }
  }

  return <>
    {googleClientId || appleClientId ? <>
      <div className={styles.divider}>{t("orContinueWith")}</div>
      <div className={styles.social} aria-label={t("otherWays")}>
        {googleClientId ? <button type="button" className={styles.socialButton} disabled={busy !== null} onClick={googleLogin}>Google</button> : null}
        {appleClientId ? <button type="button" className={styles.socialButton} disabled={busy !== null} onClick={appleLogin}>Apple</button> : null}
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
