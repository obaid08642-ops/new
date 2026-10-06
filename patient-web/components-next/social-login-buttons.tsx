"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login-form.module.css";

type Props = { locale: string; labels: { guest: string; guestLoading: string; error: string } };

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
 * Google's userinfo endpoint). Guest sign-in is always available.
 */
export function SocialLoginButtons({ locale, labels }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const tokenClient = useRef<any>(null);
  const ar = locale === "ar";

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
            if (!response?.access_token) { setError(labels.error); setBusy(null); return; }
            try {
              const res = await fetch("/api/auth/social-login", {
                method: "POST",
                headers: { "content-type": "application/json", "x-nabd-device-id": crypto.randomUUID() },
                body: JSON.stringify({ provider: "google", token: response.access_token }),
              });
              if (!res.ok) throw new Error("social_failed");
              router.replace(`/${locale}/dashboard`); router.refresh();
            } catch { setError(labels.error); } finally { setBusy(null); }
          },
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [googleClientId, locale, labels.error, router]);

  async function guestLogin() {
    if (busy) return;
    setBusy("guest"); setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });
      if (!res.ok) throw new Error("guest_failed");
      router.replace(`/${locale}/dashboard`); router.refresh();
    } catch { setError(labels.error); setBusy(null); }
  }

  return <div className={styles.socialArea}>
    {googleClientId ? (
      <div className={styles.socialGrid} aria-label={ar ? "طرق الدخول الاجتماعي" : "Social sign in options"}>
        <button type="button" className={`${styles.socialButton} ${styles.google}`} disabled={busy !== null} onClick={() => { setBusy("google"); setError(null); tokenClient.current?.requestAccessToken(); }} aria-label="Google">
          <span>G</span>
        </button>
      </div>
    ) : null}
    <button type="button" className={styles.guestButton} onClick={guestLogin} disabled={busy !== null}>
      {busy === "guest" ? labels.guestLoading : labels.guest}
    </button>
    {error ? <p className={styles.blocked} role="alert">{error}</p> : null}
  </div>;
}
