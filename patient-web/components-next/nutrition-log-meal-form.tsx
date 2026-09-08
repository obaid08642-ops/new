"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export function NutritionLogMealForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<(typeof TYPES)[number]>("snack");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const kcal = Number(calories);
    if (!name.trim() || !Number.isFinite(kcal) || kcal < 0) {
      setError(locale === "ar" ? "أدخل اسم الوجبة وسعرات صحيحة" : "Enter a meal name and valid calories");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/meals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), calories: kcal, meal_type: mealType }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (locale === "ar" ? "تعذر حفظ الوجبة" : "Could not save meal"));
        return;
      }
      router.push(`/${locale}/nutrition`);
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر حفظ الوجبة" : "Could not save meal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "نوع الوجبة" : "Meal type"}</span>
        <select value={mealType} onChange={(e) => setMealType(e.target.value as (typeof TYPES)[number])}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "اسم الوجبة" : "Meal name"}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{locale === "ar" ? "السعرات (kcal)" : "Calories (kcal)"}</span>
        <input value={calories} onChange={(e) => setCalories(e.target.value)} required inputMode="decimal" placeholder="250" />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (locale === "ar" ? "جارٍ الحفظ…" : "Saving…") : (locale === "ar" ? "حفظ الوجبة" : "Save meal")}</button>
    </form>
  );
}
