"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { isHttpsCheckoutUrl } from "@/lib/api/checkout-url";
import styles from "@/components-next/consult/consult.module.css";

/**
 * Opens the Moyasar card page for a home nursing visit (POST /payments/intent/nursing/:id through the website).
 * Returns false when the page could not be opened; the booking itself is untouched.
 */
export async function startNursingPayment(bookingId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/nursing/bookings/${encodeURIComponent(bookingId)}/payment-intent`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ method: "card" }),
    });
    const data = (await res.json().catch(() => null)) as { checkoutUrl?: unknown } | null;
    if (!res.ok || !isHttpsCheckoutUrl(data?.checkoutUrl)) return false;
    window.location.assign(data.checkoutUrl);
    return true;
  } catch {
    return false;
  }
}

/** The visit page's "Pay now" for a card visit that is not paid yet (the booking form lands here when the card page did not open). */
export function NursingPayButton({ bookingId, failedBefore }: { bookingId: string; failedBefore?: boolean }) {
  const t = useTranslations("NursingWeb");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(Boolean(failedBefore));
  async function pay() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const opened = await startNursingPayment(bookingId);
    if (!opened) { setFailed(true); setBusy(false); }
  }
  return (
    <div className={styles.actions}>
      {failed ? <p className={styles.error} role="alert">{t("payFailed")}</p> : null}
      <Button fullWidth size="lg" loading={busy} label={t("payNow")} onClick={() => void pay()} />
    </div>
  );
}
