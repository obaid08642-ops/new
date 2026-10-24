"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/health/health.module.css";

/** The app's two quick amounts (patient-app NutritionViews: +250 and +500 ml). */
export const WATER_AMOUNTS = [250, 500] as const;

/** "+250 ml" and "+500 ml": POST /nutrition/water { amount_ml } through the patient proxy (the same call as the free-amount form), then the page reloads the day. */
export function NutritionWaterQuick() {
  const t = useTranslations("NutritionWeb");
  const router = useRouter();
  const number = new Intl.NumberFormat(useLocale());
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function add(amount: number) {
    if (busy !== null) return;
    setBusy(amount);
    setError(false);
    try {
      const res = await fetch("/api/patient/nutrition/water", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-water-${crypto.randomUUID()}` },
        body: JSON.stringify({ amount_ml: amount }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(true); return; }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className={styles.toolbar}>
        {WATER_AMOUNTS.map((amount, index) => (
          <Button key={amount} label={t("addMl", { amount: number.format(amount) })} size="md" variant={index === 0 ? "outline" : "primary"} loading={busy === amount} disabled={busy !== null} onClick={() => void add(amount)} />
        ))}
      </div>
      {error ? <p className={forms.error} role="alert">{t("waterFailed")}</p> : null}
    </div>
  );
}
