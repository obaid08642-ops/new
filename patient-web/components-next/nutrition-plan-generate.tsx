"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Notice } from "@/components-next/consult/consult-parts";

/** "Generate my plan": POST /nutrition/plan/generate (AI gateway, the patient's own profile), then the page reloads the plan. */
export function NutritionPlanGenerate({ again = false }: { again?: boolean }) {
  const t = useTranslations("NutritionWeb");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const locale = useLocale();
  const key = useRef<string | null>(null);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/patient/nutrition/plan/generate", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "idempotency-key": key.current }, body: "{}" });
      const data = await response.json().catch(() => null) as { message?: unknown; code?: unknown } | null;
      if (!response.ok) {
        const code = String(data?.message ?? data?.code ?? "");
        setNeedsProfile(code.includes("nutrition_profile_required"));
        setError(code.includes("nutrition_profile_required") ? t("planNeedsProfile") : code.includes("ai_quota_exceeded") ? t("planQuota") : t("planFailed"));
        return;
      }
      key.current = null;
      setNeedsProfile(false);
      router.refresh();
    } catch {
      setError(t("planFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button label={again ? t("planRegenerate") : t("planGenerate")} variant={again ? "outline" : "primary"} fullWidth size="lg" loading={busy} disabled={busy} startIcon="sparkle" onClick={() => void generate()} />
      {error ? <div role="alert"><Notice warn>{error}</Notice></div> : null}
      {needsProfile ? <ButtonLink href={`/${locale}/nutrition?tab=target`} label={t("setTarget")} variant="outline" fullWidth /> : null}
    </div>
  );
}
