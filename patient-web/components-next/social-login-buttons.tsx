"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getStableDeviceId } from "@/lib/auth/device-id";
import { announceSignedIn } from "@/lib/auth/session-identity";
import { SocialMark } from "@/components-next/social-mark";
import "@/components-next/ui-generated/icons/social-brands.css";
import { acceptCallback, authorizeUrl, newPkce, type CodeProvider } from "@/lib/auth/social-oauth";
import type { SocialButtons } from "@/lib/auth/social-config";
import styles from "./auth/auth.module.css";

type Props = { locale: string; social: SocialButtons; onWrongApp?: () => void };

declare global {
  interface Window { google?: any; AppleID?: { auth: { init(config: Record<string, unknown>): void; signIn(): Promise<{ authorization?: { id_token?: string }; user?: { email?: string; name?: { firstName?: string; lastName?: string } } }> } } }
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
 * Guest sign-in is always available. Social sign-in offers all four providers; `social` says which ones the backend can finish and
 * their public ids (GET /auth/social/config, read by the page at run time). Google (Identity Services) and Apple send the
 * provider's token; X and Snapchat (code + PKCE in a popup, like the app) send the authorization code and the verifier, and the
 * BACKEND exchanges them with its own client secret. The backend verifies every one.
 */
export function SocialLoginButtons({ locale, social, onWrongApp }: Props) {
  const router = useRouter();
  const t = useTranslations("Login");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const appleClientId = social.apple?.clientId ?? "";
  const appleRedirect = social.apple?.redirectUri ?? "";
  const configured = Boolean(appleClientId && appleRedirect);
  const googleClientId = social.google?.clientId ?? "";
  const showX = Boolean(social.x?.clientId);
  const showSnapchat = Boolean(social.snapchat?.clientId);
  const codeClients: Record<CodeProvider, string> = { x: social.x?.clientId ?? "", snapchat: social.snapchat?.clientId ?? "" };
  const tokenClient = useRef<any>(null);
  const googleMessage = t("googleUnavailable");
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

  async function postSocial(body: Record<string, string>) {
    const res = await fetch("/api/auth/social-login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-nabd-device-id": getStableDeviceId() },
      body: JSON.stringify(body),
    });
    if (res.status === 403 && (await res.json().catch(() => null))?.message === "wrong_app") { onWrongApp?.(); return; }
    if (!res.ok) throw new Error("social_failed");
    announceSignedIn();
    router.replace(`/${locale}/dashboard`); router.refresh();
  }

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
            try { await postSocial({ provider: "google", token: response.access_token }); } catch { setError(failedMessage); } finally { setBusy(null); }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId, locale, failedMessage, googleMessage]);

  function googleLogin() {
    if (busy) return;
    setError(null);
    // The script has not loaded (offline, blocked): say so instead of leaving the buttons disabled.
    if (!tokenClient.current) { setError(googleMessage); return; }
    setBusy("google");
    try { tokenClient.current.requestAccessToken(); } catch { setBusy(null); setError(googleMessage); }
  }

  async function codeLogin(provider: CodeProvider) {
    if (busy) return;
    setError(null);
    // Not set up on the server yet: the button stays visible (the providers review the live button) and says so.
    if (!codeClients[provider]) { setError(t("providerUnavailable", { name: t(provider) })); return; }
    setBusy(provider);
    const redirectUri = `${window.location.origin}/${locale}/login/social-callback`;
    let popup: Window | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let onMessage: ((event: MessageEvent) => void) | undefined;
    try {
      const pkce = await newPkce();
      popup = window.open(authorizeUrl(provider, codeClients[provider], redirectUri, pkce), "nabd-social", "width=500,height=700");
      if (!popup) throw new Error("popup_blocked");
      const code = await new Promise<string | null>((resolve) => {
        onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const accepted = acceptCallback(pkce.state, event.data);
          if (accepted) resolve(accepted);
        };
        window.addEventListener("message", onMessage);
        // closing the popup is a choice, not an error
        timer = setInterval(() => { if (popup?.closed) resolve(null); }, 500);
      });
      if (!code) return;
      // the backend exchanges the code with its own client secret (and refuses a raw X / Snapchat access token)
      await postSocial({ provider, code, code_verifier: pkce.verifier, redirect_uri: redirectUri });
    } catch { setError(failedMessage); } finally {
      if (timer) clearInterval(timer);
      if (onMessage) window.removeEventListener("message", onMessage);
      if (popup && !popup.closed) popup.close();
      setBusy(null);
    }
  }

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
      await postSocial({ provider: "apple", token, ...(result.user?.email ? { email: result.user.email } : {}), ...(name ? { name } : {}) });
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
    {/* All four always show (owner, 2026-10-25: the providers review the live button before they approve the app). A provider the
        server has no keys for yet answers its own "not available yet" message on tap. */}
    <>
      <div className={styles.divider}>{t("orContinueWith")}</div>
      <div className={styles.social} aria-label={t("otherWays")}>
        <button type="button" className={`${styles.socialButton} socialBrandButton socialBrandGoogle`} disabled={busy !== null} onClick={googleLogin} data-configured={googleClientId ? "1" : "0"}><SocialMark brand="google" /> {t("google")}</button>
        <button type="button" className={`${styles.socialButton} socialBrandButton socialBrandApple`} disabled={busy !== null} onClick={appleLogin} data-configured={configured ? "1" : "0"}><SocialMark brand="apple" /> {t("apple")}</button>
        <button type="button" className={`${styles.socialButton} socialBrandButton socialBrandX`} disabled={busy !== null} onClick={() => codeLogin("x")} data-configured={showX ? "1" : "0"}><SocialMark brand="x" /> {t("x")}</button>
        <button type="button" className={`${styles.socialButton} socialBrandButton socialBrandSnapchat`} disabled={busy !== null} onClick={() => codeLogin("snapchat")} data-configured={showSnapchat ? "1" : "0"}><SocialMark brand="snapchat" /> {t("snapchat")}</button>
      </div>
    </>
    <div className={styles.foot}>
      <span>{t("noAccount")} <Link className={styles.link} href={`/${locale}/register`}>{t("createAccount")}</Link></span>
      <button type="button" className={`${styles.link} ${styles.guest}`} onClick={guestLogin} disabled={busy !== null}>
        {busy === "guest" ? t("guestLoading") : t("guestContinue")}
      </button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </>;
}
