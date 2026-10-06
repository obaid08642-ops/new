/**
 * P22.3 — pharmacist-safe bundle/alternative rules (PURE functions, no Nest DI).
 *
 * Two hard safety rules, unit-tested here and enforced by BundlesService:
 *  1. NO cross-selling of prescription items: an Rx medicine is never suggested
 *     as a "frequently bought together" add-on (returns in `excludedRx` for
 *     transparency instead).
 *  2. Interaction warnings: whenever a suggested bundle/alternative interacts
 *     with the patient's current medicines (by active ingredient), the warning
 *     travels WITH the suggestion — never as a separate optional call.
 */

export interface RuleMed {
  medicine_id: string;
  active_ingredient: string | null;
  requires_prescription: boolean;
  interactions: string[];
}

export interface CoPair {
  a: string;
  b: string;
  support: number;
}

function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

/**
 * Co-purchase pairs from order item sets. Each order contributes each unordered
 * pair once (one basket = one vote, so a single huge basket cannot dominate).
 */
export function coPurchasePairs(
  baskets: string[][],
  minSupport = 2,
): CoPair[] {
  const counts = new Map<string, number>();
  for (const raw of baskets) {
    const ids = [...new Set((raw || []).map((s) => String(s)).filter(Boolean))];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join('￨');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  const out: CoPair[] = [];
  for (const [key, support] of counts) {
    if (support >= minSupport) {
      const [a, b] = key.split('￨');
      out.push({ a, b, support });
    }
  }
  out.sort((x, y) => y.support - x.support || (x.a + x.b).localeCompare(y.a + y.b));
  return out;
}

/** Top co-purchased partners of one medicine. */
export function partnersOf(pairs: CoPair[], medicineId: string, limit = 5): CoPair[] {
  return pairs.filter((p) => p.a === medicineId || p.b === medicineId).slice(0, limit);
}

export interface BundlePick {
  items: RuleMed[];
  /** Rx candidates suppressed by rule 1 (transparency, never suggested). */
  excludedRx: string[];
}

/** Rule 1: strip Rx items out of cross-sell candidates. */
export function applyNoRxCrossSell(candidates: RuleMed[]): BundlePick {
  const items: RuleMed[] = [];
  const excludedRx: string[] = [];
  for (const c of candidates) {
    if (c.requires_prescription) excludedRx.push(c.medicine_id);
    else items.push(c);
  }
  return { items, excludedRx };
}

export interface InteractionWarning {
  suggested_id: string;
  interacts_with: string;
  detail: string;
}

/**
 * Rule 2: warnings for every suggestion whose `interactions` intersect the
 * patient's current active ingredients (case-insensitive, both directions).
 */
export function interactionWarnings(
  suggested: RuleMed[],
  patientIngredients: Array<string | null | undefined>,
  patientMeds: RuleMed[] = [],
): InteractionWarning[] {
  const current = new Set(
    patientIngredients.map((s) => norm(s)).filter(Boolean),
  );
  const patientInteractionSets = patientMeds.map(
    (p) => new Set(p.interactions.map((x) => norm(x)).filter(Boolean)),
  );
  const out: InteractionWarning[] = [];
  for (const s of suggested) {
    const mine = new Set(
      [s.active_ingredient, ...s.interactions].map((x) => norm(x)).filter(Boolean),
    );
    const own = norm(s.active_ingredient);
    for (const ing of current) {
      if (mine.has(ing) && own !== ing) {
        out.push({
          suggested_id: s.medicine_id,
          interacts_with: ing,
          detail: `interacts with your current medicine ingredient: ${ing}`,
        });
      }
    }
    // Reverse direction: a patient medicine that lists the suggestion's
    // ingredient in its own interactions.
    if (own) {
      const hit = patientMeds.some((p, i) => {
        if (norm(p.active_ingredient) === own) return false;
        return patientInteractionSets[i].has(own);
      });
      if (hit && !out.some((w) => w.suggested_id === s.medicine_id)) {
        out.push({
          suggested_id: s.medicine_id,
          interacts_with: own,
          detail: `a current medicine of yours interacts with ingredient: ${own}`,
        });
      }
    }
  }
  return out;
}

/** Same-active-ingredient alternatives (substitution info, Rx kept but flagged). */
export function alternativesByIngredient(
  catalog: RuleMed[],
  targetIngredient: string | null | undefined,
  targetId: string,
): RuleMed[] {
  const want = norm(targetIngredient);
  if (!want) return [];
  return catalog.filter(
    (m) => m.medicine_id !== targetId && norm(m.active_ingredient) === want,
  );
}
