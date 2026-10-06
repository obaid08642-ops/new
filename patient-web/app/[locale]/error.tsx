"use client";

import { useLocale, useTranslations } from "next-intl";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = useTranslations("RouteState");
  return (
    <main className="main auth-wrap" style={{ background: "#FDFDFC", padding: "32px 16px" }}>
      <section className="auth-card" role="alert" aria-live="assertive" style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, maxWidth: 480, margin: "0 auto", display: "grid", gap: 16, boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <span aria-hidden style={{ width: 48, height: 48, borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(255,77,90,.12)", color: "#FF4D5A" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v6" /><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" /><path d="M10.3 3.5 3.5 15.2a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" /></svg>
        </span>
        <div className="eyebrow" style={{ color: "#1E332E" }}>{t("errorCode")}</div>
        <h1 style={{ margin: 0, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("errorTitle")}</h1>
        <p style={{ margin: 0, color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("errorBody")}</p>
        <div className="route-state-actions" style={{ gap: 8, marginTop: 8 }}>
          <button className="button button-primary" type="button" onClick={reset} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "none" }}>{t("retry")}</button>
          <a className="button button-secondary" href={`/${locale}`} style={{ background: "#1E332E", color: "#fff", borderRadius: 20 }}>{t("returnHome")}</a>
        </div>
      </section>
    </main>
  );
}
