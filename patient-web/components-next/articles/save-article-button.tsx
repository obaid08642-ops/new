"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import forms from "@/components-next/consult/consult.module.css";

type State = "loading" | "guest" | "ready";

/**
 * Save or unsave one article, as the app does: the status comes from GET /articles/bookmarks/:slug/status and the change from
 * POST /articles/bookmarks/:slug/toggle (both through /api/patient). The article page is public, so the status is read in the
 * browser; a visitor who is not signed in gets a link to sign in instead of the button. The Saved tab lists what is saved.
 */
export function SaveArticleButton({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("Articles");
  const [state, setState] = useState<State>("loading");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const base = `/api/patient/articles/bookmarks/${encodeURIComponent(slug)}`;

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`${base}/status`, { cache: "no-store", credentials: "same-origin" });
        if (!live) return;
        if (res.status === 401) { setState("guest"); return; }
        if (res.ok) {
          const data: unknown = await res.json().catch(() => null);
          setSaved(!!(data && typeof data === "object" && (data as { bookmarked?: unknown }).bookmarked === true));
        }
      } catch { /* the status is unknown: the button still works */ }
      if (live) setState("ready");
    })();
    return () => { live = false; };
  }, [base]);

  async function toggle() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`${base}/toggle`, {
        method: "POST",
        headers: { "idempotency-key": `web-bookmark-${crypto.randomUUID()}` },
        credentials: "same-origin",
      });
      if (res.status === 401) { setState("guest"); return; }
      if (!res.ok) { setError(true); return; }
      const data: unknown = await res.json().catch(() => null);
      setSaved(!!(data && typeof data === "object" && (data as { bookmarked?: unknown }).bookmarked === true));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "guest") return <ButtonLink href={`/${locale}/login`} label={t("signInToSave")} variant="outline" size="lg" fullWidth />;
  return (
    <>
      <Button variant="outline" size="lg" fullWidth label={saved ? t("unsave") : t("save")} loading={busy} onClick={() => void toggle()} />
      {error ? <p className={forms.error} role="alert">{t("saveFailed")}</p> : null}
    </>
  );
}
