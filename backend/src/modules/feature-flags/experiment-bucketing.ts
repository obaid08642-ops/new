/**
 * P22.10 — sticky experiment bucketing (pure, no I/O).
 *
 * Deterministic: hash(experimentKey + salt + subjectId) → [0,100).
 * Same subject always lands in the same variant (sticky by construction).
 * Rollout gate: bucket >= rollout_percentage → 'off' (not exposed).
 * Variant pick: weighted walk over variants in definition order.
 */

export interface ExperimentVariantDef {
  name: string;
  weight: number; // share of exposed traffic, sums to 100
}

export interface GuardrailDef {
  metric: string;
  threshold: number;
  direction: 'max' | 'min';
}

export function hashToBucket(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 100; // [0,100)
}

export function pickVariant(
  experimentKey: string,
  salt: string,
  subjectId: string,
  variants: ExperimentVariantDef[],
  rolloutPercentage: number,
): { variant: string; bucket: number; exposed: boolean } {
  const bucket = hashToBucket(`${experimentKey}:${salt}:${subjectId}`);
  if (bucket >= rolloutPercentage || variants.length === 0) {
    return { variant: 'off', bucket, exposed: false };
  }
  const total = variants.reduce((s, v) => s + v.weight, 0);
  const span = (bucket / 100) * (total > 0 ? total : 100);
  let acc = 0;
  for (const v of variants) {
    acc += v.weight;
    if (span < acc) return { variant: v.name, bucket, exposed: true };
  }
  const last = variants[variants.length - 1];
  return { variant: last.name, bucket, exposed: true };
}

export interface GuardrailObservation {
  metric: string;
  value: number;
}

export function evaluateGuardrails(
  guardrails: GuardrailDef[],
  observations: GuardrailObservation[],
): Array<{ metric: string; value: number; threshold: number; breached: boolean }> {
  const byMetric = new Map(observations.map((o) => [o.metric, o.value]));
  return guardrails.map((g) => {
    const value = byMetric.get(g.metric);
    const breached =
      value === undefined ? false : g.direction === 'max' ? value > g.threshold : value < g.threshold;
    return { metric: g.metric, value: value ?? Number.NaN, threshold: g.threshold, breached };
  });
}

export interface VariantStats {
  variant: string;
  exposures: number;
  conversions: number;
  rate: number | null;
}

export function reportResult(
  exposures: Array<{ subjectId: string; variant: string }>,
  conversions: Array<{ subjectId: string }>,
): { variants: VariantStats[]; winner: string | null } {
  const converted = new Set(conversions.map((c) => c.subjectId));
  const byVariant = new Map<string, { exposures: number; conversions: number }>();
  for (const e of exposures) {
    const row = byVariant.get(e.variant) || { exposures: 0, conversions: 0 };
    row.exposures += 1;
    if (converted.has(e.subjectId)) row.conversions += 1;
    byVariant.set(e.variant, row);
  }
  const variants: VariantStats[] = [...byVariant.entries()].map(([variant, r]) => ({
    variant,
    exposures: r.exposures,
    conversions: r.conversions,
    rate: r.exposures > 0 ? Math.round((r.conversions / r.exposures) * 1000) / 10 : null,
  }));
  const eligible = variants.filter((v) => v.variant !== 'off' && v.exposures > 0);
  eligible.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  return { variants, winner: eligible.length > 0 ? eligible[0].variant : null };
}
