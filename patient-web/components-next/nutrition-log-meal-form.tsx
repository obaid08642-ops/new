"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ChoiceGroup, TextField } from "@/components-next/care/care-fields";
import forms from "@/components-next/consult/consult.module.css";

const MACROS = ["protein_g", "carbs_g", "fat_g", "fiber_g"] as const;
const TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

/** "Log a meal" (form): POST /api/nutrition/meals with the same payload as before; on success back to the hub, which reloads. */
export function NutritionLogMealForm({ locale }: { locale: string }) {
  const t = useTranslations("NutritionWeb");
  const router = useRouter();
  const [mealType, setMealType] = useState<(typeof TYPES)[number]>("snack");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  // the four optional macro fields the app sends when filled (protein_g, carbs_g, fat_g, fiber_g)
  const [macros, setMacros] = useState<Record<(typeof MACROS)[number], string>>({ protein_g: "", carbs_g: "", fat_g: "", fiber_g: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const kcal = Number(calories);
    if (!name.trim() || !calories.trim() || !Number.isFinite(kcal) || kcal < 0) {
      setError(t("mealInvalid"));
      return;
    }
    const optional: Record<string, number> = {};
    for (const key of MACROS) {
      const raw = macros[key].trim();
      if (!raw) continue;
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || value < 0 || value > 2000) { setError(t("mealInvalid")); return; }
      optional[key] = value;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/meals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), calories: kcal, meal_type: mealType, ...optional }),
      });
      if (!res.ok) {
        setError(t("mealFailed"));
        return;
      }
      router.push(`/${locale}/nutrition`);
      router.refresh();
    } catch {
      setError(t("mealFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <ChoiceGroup label={t("mealTypeLabel")} value={mealType} onChange={setMealType} options={TYPES.map((value) => ({ value, label: t(`mealType.${value}`) }))} />
      <TextField label={t("mealName")} value={name} onChange={setName} required maxLength={200} />
      <TextField label={t("mealCalories")} value={calories} onChange={setCalories} required inputMode="decimal" />
      {MACROS.map((key) => (
        <TextField key={key} label={t(`macro.${key}`)} value={macros[key]} onChange={(value) => setMacros((current) => ({ ...current, [key]: value }))} inputMode="decimal" maxLength={7} />
      ))}
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("saveMeal")} loading={saving} fullWidth />
    </form>
  );
}
