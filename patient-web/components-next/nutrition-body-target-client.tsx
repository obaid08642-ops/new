"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Spinner } from "@/components-next/ui-generated/components/Spinner";
import { ChoiceGroup, TextField } from "@/components-next/care/care-fields";
import { SectionCard } from "@/components-next/consult/consult-parts";
import forms from "@/components-next/consult/consult.module.css";

const GOALS = ["weight_loss", "maintain", "muscle_gain", "healthy"] as const;
const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;

type Profile = {
  goal: string; activity: string; height: string; weight: string; targetWeight: string;
  calorieTarget: string; waterTarget: string; restrictions: string; allergies: string; bmi: number | null;
};

const EMPTY: Profile = {
  goal: "healthy", activity: "moderate", height: "", weight: "", targetWeight: "",
  calorieTarget: "", waterTarget: "", restrictions: "", allergies: "", bmi: null,
};

/**
 * The Target tab of the nutrition hub (the old body-target page): GET and POST /api/patient/nutrition/profile with the same
 * payload as before. The goal and the activity are chips, the numbers are checked before sending.
 */
export function NutritionBodyTargetClient({ locale }: { locale: string }) {
  const t = useTranslations("NutritionWeb");
  const router = useRouter();
  const [form, setForm] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/patient/nutrition/profile", { cache: "no-store", credentials: "same-origin" });
        if (res.ok) {
          const payload = await res.json().catch(() => null);
          const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
          const r = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
          const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
          const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").join(", ") : "");
          setForm({
            goal: str(r.goal) || "healthy",
            activity: str(r.activity_level) || "moderate",
            height: str(r.height_cm),
            weight: str(r.weight_kg),
            targetWeight: str(r.target_weight_kg),
            calorieTarget: str(r.daily_calorie_target),
            waterTarget: str(r.daily_water_target_ml),
            restrictions: arr(r.dietary_restrictions),
            allergies: arr(r.allergies),
            bmi: typeof r.bmi === "number" ? r.bmi : null,
          });
        }
      } catch { /* keep the empty form */ }
      finally { setLoading(false); }
    })();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    const nums = [form.height, form.weight, form.targetWeight, form.calorieTarget, form.waterTarget];
    if (!nums.every((v) => v.trim() !== "" && Number.isFinite(Number(v)))) {
      setError(t("targetInvalid"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/patient/nutrition/profile", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-nutrition-${Date.now()}` },
        body: JSON.stringify({
          goal: form.goal,
          activity_level: form.activity,
          height_cm: Number(form.height),
          weight_kg: Number(form.weight),
          target_weight_kg: Number(form.targetWeight),
          daily_calorie_target: Number(form.calorieTarget),
          daily_water_target_ml: Number(form.waterTarget),
          dietary_restrictions: list(form.restrictions),
          allergies: list(form.allergies),
        }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        setError(t("targetFailed"));
        return;
      }
      router.replace(`/${locale}/nutrition`);
    } catch {
      setError(t("connectionFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className={forms.body}><Spinner size={20} /> {t("loading")}</p>;
  return (
    <form className={forms.stack} noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <SectionCard id="goal" title={t("goalSection")}>
        <ChoiceGroup label={t("goal")} value={form.goal} onChange={(value) => set("goal", value)} options={GOALS.map((value) => ({ value, label: t(`goalOption.${value}`) }))} />
        <ChoiceGroup label={t("activity")} value={form.activity} onChange={(value) => set("activity", value)} options={ACTIVITIES.map((value) => ({ value, label: t(`activityOption.${value}`) }))} />
      </SectionCard>
      <SectionCard id="body" title={t("bodySection")}>
        <TextField label={t("height")} inputMode="decimal" value={form.height} onChange={(value) => set("height", value)} />
        <TextField label={t("weight")} inputMode="decimal" value={form.weight} onChange={(value) => set("weight", value)} />
        <TextField label={t("targetWeight")} inputMode="decimal" value={form.targetWeight} onChange={(value) => set("targetWeight", value)} />
        {form.bmi !== null ? <p className={forms.body}>{t("bmi", { value: new Intl.NumberFormat(locale).format(form.bmi) })}</p> : null}
      </SectionCard>
      <SectionCard id="daily" title={t("dailySection")}>
        <TextField label={t("dailyCalories")} inputMode="numeric" value={form.calorieTarget} onChange={(value) => set("calorieTarget", value)} />
        <TextField label={t("dailyWater")} inputMode="numeric" value={form.waterTarget} onChange={(value) => set("waterTarget", value)} />
      </SectionCard>
      <SectionCard id="setup" title={t("setupSection")}>
        <TextField label={t("restrictions")} value={form.restrictions} onChange={(value) => set("restrictions", value)} />
        <TextField label={t("allergies")} value={form.allergies} onChange={(value) => set("allergies", value)} />
      </SectionCard>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("saveTarget")} loading={saving} fullWidth />
    </form>
  );
}
