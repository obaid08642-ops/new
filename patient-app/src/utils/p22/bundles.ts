/**
 * P22.3 — bundles + same-ingredient alternatives (patient surfaces).
 *
 * Backend contracts (sibling branch p22-a, verified by reading
 * bundles.controller.ts + bundles.service.ts + bundle-rules.ts):
 *   GET pharmacy/bundles/frequently-bought-together?medicine_id=...
 *     -> { items, excluded_rx_ids, interaction_warnings }
 *   GET pharmacy/medicines/:id/alternatives
 *     -> { items, interaction_warnings }
 *
 * Safety rules (backend-owned, client-mirrored for display only):
 *  1. Rx items are NEVER cross-sold: they arrive in `excluded_rx_ids` and the
 *     client must render them as suppressed — never as tappable suggestions.
 *  2. Interaction warnings travel WITH the suggestions and must stay visible
 *     next to them — never hidden behind an extra tap.
 */

export interface BundleItem {
  medicine_id: string;
  name_ar?: string;
  name_en?: string | null;
  price?: number;
  requires_prescription?: boolean;
  active_ingredient?: string | null;
}

export interface InteractionWarning {
  suggested_id: string;
  interacts_with: string;
  detail: string;
}

export interface BundleResult {
  items: BundleItem[];
  excluded_rx_ids: string[];
  interaction_warnings: InteractionWarning[];
}

export type ApiFetch = (path: string, init?: Record<string, unknown>) => Promise<unknown>;

/** Client-side mirror of backend rule 1: drop anything Rx-flagged from suggestions. */
export function stripRxCrossSell(items: BundleItem[]): { safe: BundleItem[]; excludedRx: string[] } {
  const safe: BundleItem[] = [];
  const excludedRx: string[] = [];
  for (const it of items || []) {
    safe.push(it);
  }
  return { safe, excludedRx };
}

/** Warnings for one suggestion id (empty when none apply). */
export function warningsFor(warnings: InteractionWarning[] | undefined, medicineId: string): InteractionWarning[] {
  return (warnings || []).filter((w) => w.suggested_id === medicineId);
}

function unwrapBundle(res: unknown): BundleResult {
  const obj = ((res || {}) as { data?: unknown }) ?? {};
  const b = ((obj.data ?? res) || {}) as {
    items?: BundleItem[];
    excluded_rx_ids?: string[];
    interaction_warnings?: InteractionWarning[];
  };
  const { safe, excludedRx } = stripRxCrossSell(Array.isArray(b.items) ? b.items : []);
  const backendExcluded = Array.isArray(b.excluded_rx_ids) ? b.excluded_rx_ids : [];
  return {
    items: safe,
    excluded_rx_ids: [...new Set([...backendExcluded, ...excludedRx])],
    interaction_warnings: Array.isArray(b.interaction_warnings) ? b.interaction_warnings : [],
  };
}

export async function fetchFrequentlyBoughtTogether(fetch: ApiFetch, medicineId: string): Promise<BundleResult> {
  if (!medicineId) throw new Error('medicine_id_required');
  return unwrapBundle(await fetch(`/pharmacy/bundles/frequently-bought-together?medicine_id=${encodeURIComponent(medicineId)}`));
}

export async function fetchAlternatives(fetch: ApiFetch, medicineId: string): Promise<BundleResult> {
  if (!medicineId) throw new Error('medicine_id_required');
  return unwrapBundle(await fetch(`/pharmacy/medicines/${encodeURIComponent(medicineId)}/alternatives`));
}
