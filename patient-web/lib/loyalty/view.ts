/**
 * What the loyalty hub reads from the backend (Batch 11): plain readers that keep the fields the server sent and drop
 * what is not there. Nothing is invented: no default target for a challenge, no end date, no rate for points, no amount a
 * referral pays. Every text (tier, perk, reward, challenge, invitee) is the server's own.
 */

export const LOYALTY_TABS = ["rewards", "challenges", "invite"] as const;
export type LoyaltyTab = (typeof LOYALTY_TABS)[number];

export type Tier = { id: string; label: string; minPts: number; perks: string[] };
export type EarnWay = { action: string; points: number | string };
export type Transaction = { id: string; delta: number; reason?: string; description?: string; createdAt?: string };
export type Reward = { id: string; title: string; description?: string; pointsRequired: number };
export type Challenge = { id: string; title: string; desc?: string; rewardPoints?: number; endDate?: string; joined: boolean; completed: boolean; progress: number; total?: number };
export type Referrals = { code: string; earned: number; total: number; invites: Array<{ id: string; name?: string; rewarded: boolean; createdAt?: string }> };

const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const listOf = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const root = rec(payload);
  return (keys.map((k) => root?.[k]).find(Array.isArray) as unknown[] | undefined) ?? [];
};

export function parseAccount(payload: unknown): { points: number; tier?: string } {
  const o = rec(payload);
  return { points: num(o?.points) ?? num(o?.balance) ?? num(o?.points_balance) ?? 0, tier: str(o?.tier) };
}

/** The tiers and ways to earn of GET /loyalty/config; no tiers is "the program is not available", never a made-up ladder. */
export function parseConfig(payload: unknown): { tiers: Tier[]; earnWays: EarnWay[] } {
  const o = rec(payload);
  const tiers = (Array.isArray(o?.tiers) ? o.tiers : []).flatMap((t): Tier[] => {
    const r = rec(t);
    const id = str(r?.id);
    const min = num(r?.minPts);
    if (!r || !id || min === undefined) return [];
    return [{ id, label: str(r.label) ?? id, minPts: min, perks: (Array.isArray(r.perks) ? r.perks : []).filter((p): p is string => typeof p === "string") }];
  });
  const earnWays = (Array.isArray(o?.earn_ways) ? o.earn_ways : []).flatMap((w): EarnWay[] => {
    const r = rec(w);
    const action = str(r?.action);
    const points = typeof r?.pts === "number" || typeof r?.pts === "string" ? (r.pts as number | string) : undefined;
    return action && points !== undefined ? [{ action, points }] : [];
  });
  return { tiers, earnWays };
}

export function parseTransactions(payload: unknown): Transaction[] {
  return listOf(payload, ["transactions", "data", "items"]).flatMap((value, index): Transaction[] => {
    const r = rec(value);
    const delta = num(r?.points_delta) ?? num(r?.points) ?? num(r?.amount);
    if (!r || delta === undefined || delta === 0) return [];
    return [{ id: String(r.id ?? `${index}-${delta}`), delta, reason: str(r.reason) ?? str(r.type), description: str(r.description), createdAt: str(r.createdAt) }];
  });
}

export function parseRewards(payload: unknown): Reward[] {
  return listOf(payload, ["data", "rewards", "items"]).flatMap((value): Reward[] => {
    const r = rec(value);
    const id = r?.id === undefined || r?.id === null ? undefined : String(r.id);
    const title = str(r?.title) ?? str(r?.title_ar) ?? str(r?.title_en);
    const cost = num(r?.points_required) ?? num(r?.cost_points);
    if (!r || !id || !title || cost === undefined) return [];
    return [{ id, title, description: str(r.description), pointsRequired: cost }];
  });
}

export function parseChallenges(payload: unknown): Challenge[] {
  return listOf(payload, ["data", "challenges"]).flatMap((value): Challenge[] => {
    const r = rec(value);
    const id = str(r?.id);
    if (!r || !id) return [];
    const progress = num(r.user_progress) ?? 0;
    const completed = r.completed === true;
    const total = num(r.target_count);
    return [{ id, title: str(r.title) ?? str(r.title_ar) ?? id, desc: str(r.desc) ?? str(r.description), rewardPoints: num(r.reward_points), endDate: str(r.end_date), joined: r.joined === true || progress > 0 || completed, completed, progress, total: total && total > 0 ? total : undefined }];
  });
}

export function parseReferrals(payload: unknown): Referrals {
  const root = rec(payload);
  const o = rec(root?.data) ?? root ?? {};
  const stats = rec(o.stats) ?? {};
  const invites = (Array.isArray(o.invites) ? o.invites : []).flatMap((i): Referrals["invites"] => {
    const r = rec(i);
    if (!r || r.id === undefined || r.id === null) return [];
    return [{ id: String(r.id), name: str(r.name), rewarded: r.status === "rewarded", createdAt: str(r.created_at) }];
  });
  return { code: str(o.code) ?? "", earned: num(stats.earned_points) ?? 0, total: num(stats.total) ?? 0, invites };
}

/** The balance's place on the tier ladder: the current tier, the next one and the share of the way (1 on the last tier). */
export function tierProgress(tiers: Tier[], tierId: string | undefined, points: number) {
  const found = tiers.findIndex((t) => t.id === tierId);
  const index = found >= 0 ? found : 0;
  const current = tiers[index];
  const next = tiers[index + 1];
  const share = current && next && next.minPts > current.minPts ? (points - current.minPts) / (next.minPts - current.minPts) : next ? 0 : 1;
  return { index, current, next, share: Math.min(1, Math.max(0, share)), missing: next ? Math.max(0, next.minPts - points) : 0 };
}

/** The tab named in the URL, or the first: a stale or hand-typed value never breaks the page. */
export function pickLoyaltyTab(value: string | string[] | undefined): LoyaltyTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (LOYALTY_TABS as readonly string[]).includes(v ?? "") ? (v as LoyaltyTab) : "rewards";
}

export type OfferRow = { id: string; title: string; provider?: string; discount?: string; price?: number; oldPrice?: number; rating?: number; sponsored: boolean };

/** GET /home/offers rows: `t`, `prov`, `disc`, `price`, `old`, `rating`, `sponsored`. */
export function parseOffers(payload: unknown): OfferRow[] {
  return listOf(payload, ["data", "offers", "items"]).flatMap((value): OfferRow[] => {
    const r = rec(value);
    const id = r?.id === undefined || r?.id === null ? undefined : String(r.id);
    const title = str(r?.t);
    if (!r || !id || !title) return [];
    const disc = r.disc;
    return [{ id, title, provider: str(r.prov), discount: (typeof disc === "string" || typeof disc === "number") && !/NaN|Infinity/.test(String(disc)) ? String(disc) : undefined, price: num(r.price), oldPrice: num(r.old), rating: num(r.rating), sponsored: r.sponsored === true }];
  });
}
