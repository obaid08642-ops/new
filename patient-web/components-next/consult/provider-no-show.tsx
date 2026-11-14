"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { canReportNoShow, noShowOpensAt, readNoShowOutcome, type NoShowOutcome } from "@/lib/consult/provider-no-show";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import { SectionCard, Notice } from "./consult-parts";

/**
 * "The doctor did not come" (lane Z's POST /care/appointments/:id/provider-no-show): appears 10 minutes after the start and only for a
 * visit that never started; a second step says what it does before anything is sent: a video visit is cancelled and refunded at once, a clinic or home visit waits 24 hours
 * for the provider, a patient who reports often goes to our team first. The answer says which one happened and the screen says the same.
 * The server decides again; its refusal is shown as an error, never as success.
 */
export function ProviderNoShow({ appointmentId, status, slotStart }: { appointmentId: string; status?: string; slotStart?: string }) {
  const t = useTranslations("ConsultClient");
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const [done, setDone] = useState<NoShowOutcome | null>(null);
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
      setDone(readNoShowOutcome(await res.json().catch(() => null)));
      setAsking(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Notice>{done.status === "held" && done.refundAfter ? t("noShowHeld", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(done.refundAfter)) }) : done.status === "pending_review" ? t("noShowReview") : t("noShowDone")}</Notice>;
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
