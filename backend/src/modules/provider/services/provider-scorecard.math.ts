/**
 * P22.12 — provider scorecard math (pure, no I/O).
 *
 * Scorecard: acceptance rate, time-to-accept, cancellations, ratings,
 * complaints. The blended reliability feeds the existing ranking path
 * (ProviderMatchingService reads provider_scores.reliability_score).
 */

export interface ScorecardInput {
  totalRequests: number;
  accepted: number;
  rejected: number;
  cancelled: number;
  completed: number;
  acceptResponseSeconds: number[];
  avgRating: number | null;
  ratingsCount: number;
  complaintsOpen: number;
  complaintsTotal: number;
}

export interface Scorecard {
  acceptanceRate: number;
  timeToAcceptMedianSeconds: number | null;
  cancellationRate: number;
  avgRating: number | null;
  ratingsCount: number;
  complaintsOpen: number;
  complaintsTotal: number;
  reliabilityBlended: number;
  tier: 'excellent' | 'good' | 'watch' | 'probation';
  breached: boolean;
  breachReasons: string[];
}

const round1 = (v: number): number => Math.round(v * 10) / 10;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

/**
 * Blend the base reliability (acceptance/completion/speed, 0..100) with
 * quality signals. Ratings pull toward 5★ scale; open complaints and high
 * cancellation rates penalize. Result stays 0..100.
 */
export function blendReliability(
  base: number,
  input: Pick<ScorecardInput, 'avgRating' | 'complaintsOpen' | 'cancelled' | 'totalRequests'>,
): number {
  let out = base;
  if (input.avgRating !== null) {
    const ratingPoints = (input.avgRating / 5) * 100;
    out = out * 0.7 + ratingPoints * 0.3;
  }
  out -= Math.min(30, input.complaintsOpen * 10);
  const cancelRate = input.totalRequests > 0 ? input.cancelled / input.totalRequests : 0;
  if (cancelRate >= 0.3) out -= 15;
  else if (cancelRate >= 0.15) out -= 7;
  return Math.max(0, Math.min(100, Math.round(out)));
}

export const ALERT_THRESHOLDS = {
  minReliability: 50,
  maxComplaintsOpen: 3,
  maxCancelRate: 0.3,
  minRating: 3.5,
};

export function computeScorecard(input: ScorecardInput, baseReliability: number): Scorecard {
  const decided = input.accepted + input.rejected;
  const acceptanceRate = decided > 0 ? round1(input.accepted / decided) : 0;
  const cancellationRate = input.totalRequests > 0 ? round1(input.cancelled / input.totalRequests) : 0;
  const reliabilityBlended = blendReliability(baseReliability, {
    avgRating: input.avgRating,
    complaintsOpen: input.complaintsOpen,
    cancelled: input.cancelled,
    totalRequests: input.totalRequests,
  });
  const breachReasons: string[] = [];
  if (reliabilityBlended < ALERT_THRESHOLDS.minReliability) breachReasons.push('reliability_below_50');
  if (input.complaintsOpen >= ALERT_THRESHOLDS.maxComplaintsOpen) breachReasons.push('complaints_open_3_plus');
  if (cancellationRate >= ALERT_THRESHOLDS.maxCancelRate) breachReasons.push('cancel_rate_30pct_plus');
  if (input.avgRating !== null && input.ratingsCount >= 5 && input.avgRating < ALERT_THRESHOLDS.minRating) {
    breachReasons.push('rating_below_3_5');
  }
  const tier =
    breachReasons.length > 0 ? 'probation' : reliabilityBlended >= 80 ? 'excellent' : reliabilityBlended >= 65 ? 'good' : 'watch';
  return {
    acceptanceRate,
    timeToAcceptMedianSeconds: median(input.acceptResponseSeconds),
    cancellationRate,
    avgRating: input.avgRating,
    ratingsCount: input.ratingsCount,
    complaintsOpen: input.complaintsOpen,
    complaintsTotal: input.complaintsTotal,
    reliabilityBlended,
    tier,
    breached: breachReasons.length > 0,
    breachReasons,
  };
}
