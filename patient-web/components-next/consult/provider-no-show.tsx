"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { canReportNoShow, noShowOpensAt } from "@/lib/consult/provider-no-show";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { SectionCard, Notice } from "./consult-parts";

/**
 * "The doctor did not come" (lane Z's POST /care/appointments/:id/provider-no-show): appears 10 minutes after the start and only for a
 * visit that never started; a second step says what it does (the visit is cancelled, a full refund at once) before anything is sent.
 * The server decides again; its refusal is shown as an error, never as success.
 */
export function ProviderNoShow({ appointmentId, status, slotStart }: { appointmentId: string; status?: string; slotStart?: string }) {
  const t = useTranslations("ConsultWeb");
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  // wake the screen when the button should appear (the page was rendered before the 10 minutes were up)
  useEffect(() => {
    setNow(Date.now());
    const opensAt = noShowOpensAt(status, slotStart);
    if (opensAt === null) return;
    const wait = opensAt - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(wait + 500, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [status, slotStart]);

  async function send() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/patient/care/appointments/${encodeURIComponent(appointmentId)}/provider-no-show`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() }, body: "{}" });
      if (!res.ok) { setError(true); return; }
      setDone(true);
      setAsking(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Notice>{t("noShowDone")}</Notice>;
  if (now === null || !canReportNoShow(status, slotStart, now)) return null;
  return (
    <SectionCard id="appointment-no-show" title={t("noShowTitle")}>
      {asking ? (
        <>
          <p>{t("noShowConfirmBody")}</p>
          {error ? <Notice warn>{t("noShowError")}</Notice> : null}
          <Button label={t("noShowConfirm")} size="lg" fullWidth loading={busy} onClick={() => void send()} />
          <Button label={t("noShowKeep")} variant="outline" size="lg" fullWidth disabled={busy} onClick={() => setAsking(false)} />
        </>
      ) : (
        <Button label={t("noShowButton")} variant="outline" size="lg" fullWidth onClick={() => setAsking(true)} />
      )}
    </SectionCard>
  );
}
