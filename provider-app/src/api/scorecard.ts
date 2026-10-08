import client from './client';

/**
 * P22.12 — provider scorecard VIEW.
 *
 * Backend contract (verified read-only against backend/src/modules in this
 * worktree): NO provider-self scorecard route exists. The only scorecard
 * route is the ADMIN-only list `GET /scorecard` (compat/admin-spa.module.ts,
 * ADMIN-only, different shape: rating_avg / rating_count /
 * completed_appointments — not the blended-reliability shape below), and no
 * `admin/providers/scorecards/:id`, `provider-scorecard.math.ts`, or
 * `/provider/reviews` route exists either. So this module calls the proposed
 * self route below.
 *
 * NEEDS-BACKEND: GET /provider/scorecard — same JWT provider identity the
 * other /provider/* routes use; returns the Scorecard shape from
 * provider-scorecard.math.ts for the CALLER (acceptanceRate,
 * timeToAcceptMedianSeconds, cancellationRate, avgRating, ratingsCount,
 * complaintsOpen, complaintsTotal, reliabilityBlended, tier, breached,
 * breachReasons). Until it ships, the screen shows an honest unavailable
 * state instead of fabricated numbers.
 */

export type ScorecardTier = 'excellent' | 'good' | 'watch' | 'probation';

export interface ProviderScorecard {
  acceptanceRate: number;
  timeToAcceptMedianSeconds: number | null;
  cancellationRate: number;
  avgRating: number | null;
  ratingsCount: number;
  complaintsOpen: number;
  complaintsTotal: number;
  reliabilityBlended: number;
  tier: ScorecardTier;
  breached: boolean;
  breachReasons: string[];
}

export const SCORECARD_PATH = '/provider/scorecard';

export function isScorecard(v: unknown): v is ProviderScorecard {
  const o = v as Record<string, unknown>;
  return (
    !!o &&
    typeof o.acceptanceRate === 'number' &&
    typeof o.cancellationRate === 'number' &&
    typeof o.reliabilityBlended === 'number' &&
    typeof o.tier === 'string' &&
    typeof o.breached === 'boolean'
  );
}

/** Fetch the caller's own scorecard. Throws scorecard_unavailable on any non-conforming payload. */
export async function getMyScorecard(): Promise<ProviderScorecard> {
  const res = await client.get(SCORECARD_PATH);
  const data = res.data?.data || res.data;
  if (!isScorecard(data)) throw new Error('scorecard_unavailable');
  return data;
}
