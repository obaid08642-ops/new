/** What the nutrition hub reads from GET /nutrition/daily-summary and GET /nutrition/meals. A value of the wrong type is dropped. */
export type NutritionSummary = { calories: number; target: number | null; waterMl: number };
export type Meal = { id: string; name: string; calories?: number; type?: string };

const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const finite = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function parseNutritionSummary(payload: unknown): NutritionSummary {
  const root = rec(payload);
  const data = rec(root?.data) ?? root;
  // GET /nutrition/daily-summary (nutrition.service getDailySummary) answers calories { consumed, target } and water
  // { consumed_ml, target_ml }; reading them as plain numbers showed 0 calories, no target and 0 ml whatever was logged.
  const calories = rec(data?.calories);
  const water = rec(data?.water);
  return {
    calories: finite(calories?.consumed) ?? finite(data?.calories) ?? finite(data?.total_calories) ?? 0,
    target: finite(calories?.target) ?? finite(data?.target_calories) ?? finite(data?.calorie_target),
    waterMl: finite(water?.consumed_ml) ?? finite(data?.water_ml) ?? finite(data?.water) ?? 0,
  };
}

export function parseMeals(payload: unknown): Meal[] {
  const root = rec(payload);
  const rows = (Array.isArray(payload) ? payload : [root?.data, root?.meals, root?.items].find(Array.isArray)) ?? [];
  return (rows as unknown[]).flatMap((value, index) => {
    const row = rec(value);
    if (!row) return [];
    const name = String(row.name ?? row.title ?? row.meal_type ?? "");
    if (!name) return [];
    const calories = finite(row.calories);
    return [{ id: typeof row.id === "string" ? row.id : `meal-${index}`, name, calories: calories ?? undefined, type: typeof row.meal_type === "string" ? row.meal_type : undefined }];
  });
}
