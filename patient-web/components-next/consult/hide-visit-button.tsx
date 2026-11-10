"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import type { VisitKind } from "@/lib/history/hidden-visits";

/**
 * PT-54: "Hide" a finished visit from my history, or "Show again" (POST /unified-bookings/:kind/:id/hide | unhide, through the patient
 * proxy). Nothing about the visit changes: the doctor, the invoice and the medical record keep it. The list reloads after the answer;
 * a refusal (the visit is not finished, offline) shows an error line and changes nothing.
 */
export function HideVisitButton({ kind, id, hidden }: { kind: VisitKind; id: string; hidden: boolean }) {
  const t = useTranslations("ConsultClient");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/patient/unified-bookings/${kind}/${encodeURIComponent(id)}/${hidden ? "unhide" : "hide"}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() }, body: "{}" });
      if (!res.ok) { setError(true); return; }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button label={hidden ? t("showVisit") : t("hideVisit")} variant="outline" size="sm" loading={busy} onClick={() => void toggle()} />
      {error ? <p role="alert">{t("hideError")}</p> : null}
    </>
  );
}
