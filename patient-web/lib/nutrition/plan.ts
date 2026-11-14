/**
 * The AI nutrition plan (GET /nutrition/plan, POST /nutrition/plan/generate; owner decision 2026-10-05) read for the page:
 * the days the AI gateway returned, each with its meals as text. A plan that is not in this shape is "no plan" (nothing is
 * invented). `notice` is a server code shown through the message files.
 */
export type PlanDay = { day: number; meals: string[] };
export type NutritionPlanView = { id: string; createdAt: string | null; days: PlanDay[] };

function mealText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() ? value.trim().slice(0, 300) : null;
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const parts = [v.name, v.title, v.meal, v.description].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    return parts.length ? parts.join(": ").slice(0, 300) : null;
  }
  return null;
}

export function parseNutritionPlan(payload: unknown): NutritionPlanView | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const id = typeof root.id === "string" ? root.id : null;
  if (!id || !Array.isArray(root.days)) return null;
  const days = root.days.slice(0, 14).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    const meals = (Array.isArray(e.meals) ? e.meals : []).map(mealText).filter((m): m is string => m !== null).slice(0, 12);
    if (!meals.length) return [];
    const day = Number.isInteger(e.day) && (e.day as number) > 0 ? (e.day as number) : index + 1;
    return [{ day, meals }];
  });
  if (!days.length) return null;
  return { id, createdAt: typeof root.created_at === "string" ? root.created_at : null, days };
}

/**
 * Whether GET /nutrition/profile holds the height and weight a plan is made from (the same rule as POST /nutrition/plan/generate,
 * which answers 400 `nutrition_profile_required` otherwise). `null` when the reply is not readable: the button is then kept.
 */
export function hasBodyProfile(payload: unknown): boolean | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const root = payload as Record<string, unknown>;
  const profile = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  return Number(profile.height_cm) > 0 && Number(profile.weight_kg) > 0;
}
