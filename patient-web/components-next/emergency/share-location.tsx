"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { ActionLinks, Notice } from "@/components-next/consult/consult-parts";

type Shared = { kind: "sent"; notified: number; sms: Array<{ name: string; href: string }> } | { kind: "error" | "permission" } | null;

/** POST /emergency/share-location answer: contacts reached in the app, and an `sms:` link for each of the others. */
export function parseShareResult(value: unknown): { notified: number; sms: Array<{ name: string; href: string }> } | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { notified?: unknown; sms_links?: unknown };
  const notified = typeof v.notified === "number" && v.notified >= 0 ? v.notified : 0;
  const sms = (Array.isArray(v.sms_links) ? v.sms_links : []).flatMap((row) => {
    const r = row as { name?: unknown; href?: unknown };
    return typeof r?.href === "string" && r.href.startsWith("sms:") ? [{ name: typeof r.name === "string" ? r.name : "", href: r.href }] : [];
  });
  return { notified, sms };
}

/**
 * Owner decision 14, second action: "send my location to my family". The browser's position goes to
 * POST /emergency/share-location, which notifies the patient's emergency contacts who use the app and answers an SMS link
 * for the others (#665). Nothing is sent without the location permission.
 */
export function ShareLocation() {
  const t = useTranslations("Emergency");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<Shared>(null);
  const count = new Intl.NumberFormat(locale);

  function share() {
    if (busy) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) { setShared({ kind: "permission" }); return; }
    setBusy(true);
    setShared(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/patient/emergency/share-location", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
          });
          const result = response.ok ? parseShareResult(await response.json().catch(() => null)) : null;
          setShared(result ? { kind: "sent", ...result } : { kind: "error" });
        } catch {
          setShared({ kind: "error" });
        } finally {
          setBusy(false);
        }
      },
      () => { setShared({ kind: "permission" }); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div role="group" aria-label={t("share")}>
      <Button label={t("share")} variant="outline" fullWidth size="lg" loading={busy} disabled={busy} startIcon="map-pin" onClick={share} />
      <div aria-live="polite">
        {shared?.kind === "permission" ? <Notice warn>{t("sharePermission")}</Notice> : null}
        {shared?.kind === "error" ? <div role="alert"><Notice warn>{t("shareError")}</Notice></div> : null}
        {shared?.kind === "sent" && shared.notified === 0 && shared.sms.length === 0 ? (
          <>
            <Notice warn>{t("shareNoContacts")}</Notice>
            <ButtonLink href={`/${locale}/health/profile`} label={t("shareAddContacts")} variant="outline" />
          </>
        ) : null}
        {shared?.kind === "sent" && shared.notified > 0 ? <Notice>{t("shareSent", { n: count.format(shared.notified) })}</Notice> : null}
        {shared?.kind === "sent" && shared.sms.length > 0 ? (
          <ActionLinks actions={shared.sms.map((link) => ({ href: link.href, label: t("shareSms", { name: link.name || t("shareContact") }), variant: "outline" as const, external: true }))} />
        ) : null}
      </div>
    </div>
  );
}
