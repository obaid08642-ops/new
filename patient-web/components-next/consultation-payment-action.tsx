"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { isHttpsCheckoutUrl } from "@/lib/api/checkout-url";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Method = "card" | "apple-pay" | "google-pay";
type Capabilities = { booking_id: string; amount: number; currency: "SAR"; purpose: "consultation_card_payment"; methods: Array<{ id: Method; kind: "online" }> };

export function ConsultationPaymentAction({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("ConsultClient");
  const locale = useLocale();
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null); const [loading, setLoading] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const label = (method: Method) => (method === "apple-pay" ? "Apple Pay" : method === "google-pay" ? "Google Pay" : t("payCard")); // i18n-ok: payment brand names
  async function load() { if (loading) return; setLoading(true); setMessage(null); try { const response = await fetch(`/api/appointments/${appointmentId}/payment-capabilities`, { cache: "no-store" }); const data = await response.json().catch(() => null); if (!response.ok || !data) { setMessage(t("payNotAvailable")); return; } setCapabilities(data as Capabilities); } catch { setMessage(t("payLoadFailed")); } finally { setLoading(false); } }
  async function begin(method: Method) { if (loading || !capabilities?.methods.some((item) => item.id === method)) return; setLoading(true); setMessage(null); try { const response = await fetch(`/api/appointments/${appointmentId}/payment-intent`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ method }) }); const data = await response.json().catch(() => null); if (!response.ok || !isHttpsCheckoutUrl(data?.checkoutUrl)) { setMessage(t("payStartUnsafe")); return; } window.location.assign(data.checkoutUrl); } catch { setMessage(t("payStartFailed")); } finally { setLoading(false); } }
  return (
    <section className={rx.card} aria-labelledby="consultation-payment-title">
      <h2 id="consultation-payment-title" className={styles.sectionTitle}>{t("payHeading")}</h2>
      <p className={`${styles.body} ${styles.muted}`}>{t("payNote")}</p>
      {capabilities ? (
        <>
          <p className={styles.body}>{t("payAmountDue", { amount: formatMoney(locale, capabilities.amount, capabilities.currency) })}</p>
          <div className={styles.actions}>
            {capabilities.methods.map((item) => (
              <Button key={item.id} variant="outline" fullWidth label={label(item.id)} loading={loading} onClick={() => void begin(item.id)} />
            ))}
          </div>
          {capabilities.methods.length === 0 ? <p className={`${styles.body} ${styles.muted}`}>{t("payNoMethods")}</p> : null}
        </>
      ) : (
        <Button fullWidth startIcon="shield-check" label={t("payShow")} loading={loading} onClick={() => void load()} />
      )}
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
    </section>
  );
}
