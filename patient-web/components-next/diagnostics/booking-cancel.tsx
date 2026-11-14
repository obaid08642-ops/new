"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "@/components-next/pharmacy/rx.module.css";
import consult from "@/components-next/consult/consult.module.css";
import type { DiagnosticDomain } from "@/lib/api/diagnostics";

/** Cancel a lab or radiology booking that has not started (POST /labs|radiology/bookings/:id/cancel, as the app): asks once, then refreshes the page. */
export function DiagnosticBookingCancel({ domain, bookingId }: { domain: DiagnosticDomain; bookingId: string }) {
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const key = useRef<string | null>(null);

  async function cancel() {
    if (busy) return;
    setBusy(true); setError(false);
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/patient/${domain}/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: "POST", headers: { "idempotency-key": key.current } });
      if (!response.ok) { setError(true); return; }
      setAsking(false);
      router.refresh();
    } catch { setError(true); } finally { setBusy(false); }
  }

  return (
    <section className={rx.card} aria-label={t("cancelBooking")}>
      {asking ? (
        <div className={consult.stack}>
          <p className={consult.body} role="status">{t("cancelBookingConfirm")}</p>
          {error ? <p className={consult.error} role="alert">{t("cancelBookingFailed")}</p> : null}
          <div className={consult.actionsRow}>
            <Button variant="danger" label={t("cancelBookingYes")} onClick={cancel} disabled={busy} />
            <Button variant="outline" label={t("cancelBookingBack")} onClick={() => { setAsking(false); setError(false); }} disabled={busy} />
          </div>
        </div>
      ) : (
        <Button variant="danger" fullWidth label={t("cancelBooking")} onClick={() => setAsking(true)} />
      )}
    </section>
  );
}
