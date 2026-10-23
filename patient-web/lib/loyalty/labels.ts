/**
 * The loyalty config sends Arabic texts for tiers, perks and ways to earn, each with a stable code (`tier.id`, `perk_codes`,
 * `earn_ways[].reason`). The pages show the code's translation in the page's language, and the server's own text only for a
 * code this build does not know (a perk added later).
 */
export const TIER_IDS = ["bronze", "silver", "gold", "platinum"] as const;
export const PERK_CODES = [
  "cashback_5_consult", "priority_standard", "cashback_8", "free_pharmacy_shipping", "priority_advanced", "cashback_12",
  "free_consult_monthly_1", "support_priority_24_7", "cashback_15", "free_consult_monthly_2", "personal_health_manager", "exclusive_offers",
] as const;
export const EARN_REASONS = ["booking_completed", "order_delivered", "review_submitted", "referral_converted", "vitals_logged"] as const;

type Translate = (key: string) => string;

export const knownTier = (id: string): boolean => (TIER_IDS as readonly string[]).includes(id);
export const knownPerk = (code: string | undefined): code is string => code !== undefined && (PERK_CODES as readonly string[]).includes(code);
export const knownEarn = (reason: string | undefined): reason is string => reason !== undefined && (EARN_REASONS as readonly string[]).includes(reason);

export function tierLabel(t: Translate, tier: { id: string; label: string }): string {
  return knownTier(tier.id) ? t(`tier.${tier.id}`) : tier.label;
}

export function perkLabel(t: Translate, text: string, code: string | undefined): string {
  return knownPerk(code) ? t(`perk.${code}`) : text;
}

/** A way to earn: its translated name, and its points text ("+50", or "varies by challenge" for the health challenge). */
export function earnLabels(t: Translate, way: { action: string; points: number | string; reason?: string }): { title: string; points: number | string; varies: boolean } {
  if (knownEarn(way.reason)) return { title: t(`earn.${way.reason}`), points: way.points, varies: false };
  if (way.reason === undefined && typeof way.points === "string" && !/^[+\-]?\d/.test(way.points.trim())) {
    return { title: t("earn.challenge"), points: t("earn.perChallenge"), varies: true };
  }
  return { title: way.action, points: way.points, varies: false };
}
