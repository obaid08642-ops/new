"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

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

export function NutritionBodyTargetClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
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
      } catch { /* keep empty form */ }
      finally { setLoading(false); }
    })();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    const nums = [form.height, form.weight, form.targetWeight, form.calorieTarget, form.waterTarget];
    if (!nums.every((v) => v.trim() !== "" && Number.isFinite(Number(v)))) {
      setError(ar ? "أكمل الطول والوزن والأهداف بأرقام صحيحة" : "Complete height, weight and targets with valid numbers");
      return;
    }
    setSaving(true); setError(null);
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
      if (!res.ok) { setError(ar ? "تعذر حفظ الأهداف" : "Could not save targets"); return; }
      router.replace(`/${locale}/nutrition`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setSaving(false); }
  }

  if (loading) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      <section aria-label={ar ? "الهدف والنشاط" : "Goal & activity"}>
        <h2>{ar ? "هدفك" : "Your goal"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label={ar ? "الهدف" : "Goal"}>
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={form.goal === g} onClick={() => set("goal", g)}>{g}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label={ar ? "النشاط" : "Activity"}>
          {ACTIVITIES.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={form.activity === a} onClick={() => set("activity", a)}>{a}</button>
          ))}
        </div>
      </section>
      <section aria-label={ar ? "الجسم" : "Body"}>
        <h2>{ar ? "الجسم" : "Body"}</h2>
        <label>{ar ? "الطول (سم)" : "Height (cm)"} <input inputMode="decimal" value={form.height} onChange={(e) => set("height", e.target.value)} /></label>{" "}
        <label>{ar ? "الوزن (كجم)" : "Weight (kg)"} <input inputMode="decimal" value={form.weight} onChange={(e) => set("weight", e.target.value)} /></label>{" "}
        <label>{ar ? "الوزن المستهدف (كجم)" : "Target weight (kg)"} <input inputMode="decimal" value={form.targetWeight} onChange={(e) => set("targetWeight", e.target.value)} /></label>
        {form.bmi !== null ? <p>BMI: {form.bmi}</p> : null}
      </section>
      <section aria-label={ar ? "الملخص اليومي" : "Daily summary"}>
        <h2>{ar ? "الملخص اليومي" : "Daily summary"}</h2>
        <label>{ar ? "السعرات اليومية" : "Daily calories"} <input inputMode="numeric" value={form.calorieTarget} onChange={(e) => set("calorieTarget", e.target.value)} /></label>{" "}
        <label>{ar ? "الماء اليومي (مل)" : "Daily water (ml)"} <input inputMode="numeric" value={form.waterTarget} onChange={(e) => set("waterTarget", e.target.value)} /></label>
      </section>
      <section aria-label={ar ? "الإعداد" : "Setup"}>
        <h2>{ar ? "الإعداد" : "Setup"}</h2>
        <label>{ar ? "قيود غذائية (افصل بفاصلة)" : "Dietary restrictions (comma separated)"} <input value={form.restrictions} onChange={(e) => set("restrictions", e.target.value)} /></label>{" "}
        <label>{ar ? "حساسية (افصل بفاصلة)" : "Allergies (comma separated)"} <input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} /></label>
      </section>
      <button type="button" onClick={save} disabled={saving}>{ar ? "حفظ الأهداف" : "Save targets"}</button>
    </div>
  );
}
