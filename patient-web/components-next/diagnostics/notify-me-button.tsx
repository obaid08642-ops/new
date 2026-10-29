"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import forms from "@/components-next/consult/consult.module.css";

type State = "loading" | "guest" | "ready" | "done";
export type InterestType = "lab" | "radiology" | "nursing";

/**
 * "Notify me when available" on a catalogue service nobody offers yet (POST /catalogue-interest { service_type, service_id } through
 * /api/patient; the server keeps one interest per patient and service, so pressing twice leaves one). Whether the patient already asked comes
 * from GET /catalogue-interest/mine. A visitor who is not signed in gets the sign-in link instead of the button; once registered the button
 * is replaced by a confirmation.
 */
export function NotifyMeButton({ serviceType, serviceId, locale }: { serviceType: InterestType; serviceId: string; locale: string }) {
  const t = useTranslations("DiagWeb");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/patient/catalogue-interest/mine", { cache: "no-store", credentials: "same-origin" });
        if (!live) return;
        if (res.status === 401) { setState("guest"); return; }
        if (res.ok) {
          const rows: unknown = await res.json().catch(() => null);
          const asked = Array.isArray(rows) && rows.some((row) => !!row && typeof row === "object" && (row as { service_type?: unknown }).service_type === serviceType && (row as { service_id?: unknown }).service_id === serviceId);
          if (asked) { setState("done"); return; }
        }
      } catch { /* unknown: the button still works */ }
      if (live) setState("ready");
    })();
    return () => { live = false; };
  }, [serviceType, serviceId]);

  async function register() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/patient/catalogue-interest", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-interest-${crypto.randomUUID()}` },
        credentials: "same-origin",
        body: JSON.stringify({ service_type: serviceType, service_id: serviceId }),
      });
      if (res.status === 401) { setState("guest"); return; }
      if (!res.ok) { setError(true); return; }
      setState("done");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "guest") return <ButtonLink href={`/${locale}/login`} label={t("notifyMeSignIn")} variant="outline" size="lg" fullWidth />;
  if (state === "done") return <p className={forms.body} role="status" data-testid="notify-me-done">{t("notifyMeDone")}</p>;
  return (
    <>
      <Button variant="primary" size="lg" fullWidth label={t("notifyMe")} loading={busy} onClick={() => void register()} />
      {error ? <p className={forms.error} role="alert">{t("notifyMeFailed")}</p> : null}
    </>
  );
}
