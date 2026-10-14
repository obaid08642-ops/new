/**
 * The AI nutrition plan (GET /nutrition/plan, POST /nutrition/plan/generate; owner decision 2026-10-05): the days the AI
 * gateway returned, each with its meals as text. Anything else is "no plan"; nothing is invented.
 */
export interface PlanDay { day: number; meals: string[] }
export interface NutritionPlanView { id: string; days: PlanDay[] }

function mealText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value.trim().slice(0, 300) : null;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const parts = [v.name, v.title, v.meal, v.description].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
    return parts.length ? parts.join(': ').slice(0, 300) : null;
  }
  return null;
}

export function parseNutritionPlan(payload: unknown): NutritionPlanView | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.id !== 'string' || !Array.isArray(root.days)) return null;
  const days = root.days.slice(0, 14).flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const e = entry as Record<string, unknown>;
    const meals = (Array.isArray(e.meals) ? e.meals : []).map(mealText).filter((m): m is string => m !== null).slice(0, 12);
    if (!meals.length) return [];
    const day = Number.isInteger(e.day) && (e.day as number) > 0 ? (e.day as number) : index + 1;
    return [{ day, meals }];
  });
  return days.length ? { id: root.id, days } : null;
}
