import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Nutrition");
  const today = new Date().toISOString().slice(0, 10);
  const [summaryRes, mealsRes] = await Promise.all([
    callPatientApi(`/nutrition/daily-summary?date=${today}`, {}, token),
    callPatientApi(`/nutrition/meals?date=${today}`, {}, token),
  ]);
  const summaryRaw = summaryRes.ok ? await summaryRes.json().catch(() => null) : null;
  const summary = summaryRaw && typeof summaryRaw === "object" && !Array.isArray(summaryRaw)
    ? (typeof (summaryRaw as Record<string, unknown>).data === "object" ? (summaryRaw as Record<string, unknown>).data : summaryRaw) as Record<string, unknown>
    : null;
  const calories = Number(summary?.calories ?? summary?.total_calories ?? NaN);
  const target = Number(summary?.target_calories ?? summary?.calorie_target ?? NaN);
  const water = Number(summary?.water_ml ?? summary?.water ?? NaN);
  const mealsRaw = mealsRes.ok ? await mealsRes.json().catch(() => null) : null;
  const mealsRoot = mealsRaw && typeof mealsRaw === "object" && !Array.isArray(mealsRaw) ? mealsRaw as Record<string, unknown> : null;
  const mealsList = (Array.isArray(mealsRaw) ? mealsRaw : [mealsRoot?.data, mealsRoot?.meals, mealsRoot?.items].find(Array.isArray)) ?? [];
  const meals = mealsList.flatMap((value: unknown) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r) return [];
    const name = String(r.name ?? r.title ?? r.meal_type ?? "");
    if (!name) return [];
    return [{ id: String(r.id ?? name), name, calories: Number(r.calories ?? NaN) || undefined, type: typeof r.meal_type === "string" ? r.meal_type : undefined }];
  });
  const stat = (label: string, value: string) => (
    <div key={label} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  );
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    <h2 style={{ fontSize: 16, opacity: 0.75 }}>{new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date())}</h2>
    {!summaryRes.ok ? <p role="alert">{t("error")}</p> : (
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {Number.isFinite(calories) ? stat(t("calories"), calories.toLocaleString(locale)) : null}
        {Number.isFinite(target) ? stat(t("target"), target.toLocaleString(locale)) : null}
        {Number.isFinite(water) ? stat(t("water"), `${water.toLocaleString(locale)} ${t("ml")}`) : null}
        {!Number.isFinite(calories) && !Number.isFinite(water) ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : null}
      </section>
    )}
    <h2>{t("meals")}</h2>
    {meals.length === 0 ? <p style={{ opacity: 0.7 }}>{t("noMeals")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {meals.map((meal) => (
          <li key={meal.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
            <span>{meal.name}</span>
            <span style={{ opacity: 0.7, fontSize: 14 }}>{meal.calories !== undefined ? `${meal.calories.toLocaleString(locale)} ${t("kcal")}` : meal.type ?? ""}</span>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
