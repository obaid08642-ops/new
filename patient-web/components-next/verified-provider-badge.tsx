import Link from "next/link";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { localizedUrl } from "@/lib/seo";
import { isLocale, type Locale } from "@/lib/i18n";

/**
 * 13.R17 — "Verified on Nabd+" provider badge snippet.
 *
 * Shared snippet for provider profile surfaces:
 * - `app/[locale]/doctor/[slug]/page.tsx` (+ `[city]` GEO variant)
 * - `app/[locale]/facility/[slug]/page.tsx`
 * - `app/[locale]/consultations/doctors/[doctorId]/page.tsx`
 * - `app/[locale]/consultations/clinics/[clinicId]/page.tsx`
 * - `app/[locale]/home-care/providers/page.tsx` (list)
 *
 * Verified-flag source (fail-closed): the public/catalog governance pair
 * `public_eligibility:true` + `medical_review_status:'approved'` layered over the
 * operational provider status (`approved`/`active`), mirroring the
 * `extractHomeCareProviders` gate (`active !== false`, `approval_status === "approved"`).
 *
 * Canonical href source: `localizedUrl(locale, path)` from `@/lib/seo`
 * (same builder the profile pages use for `alternates.canonical`).
 *
 * Renders `null` (no markup at all — no layout shift) when unverified or when
 * no safe canonical provider path is given. Never fabricates a link.
 */

type ProviderRecord = Record<string, unknown>;

function recordOf(provider: unknown): ProviderRecord | null {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) return null;
  return provider as ProviderRecord;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v === "" ? null : v;
}

function pick(record: ProviderRecord, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

const APPROVAL_KEYS = [
  "approval_status",
  "approvalStatus",
  "status",
  "account_status",
  "accountStatus",
  "verification_status",
  "verificationStatus",
];

const ELIGIBILITY_KEYS = [
  "public_eligibility",
  "publicEligibility",
  "public_eligible",
  "publicEligible",
  "is_public",
  "isPublic",
];

const REVIEW_KEYS = ["medical_review_status", "medicalReviewStatus", "review_status", "reviewStatus"];

const ACTIVE_KEYS = ["active", "is_active", "isActive", "is_active_account", "enabled"];

/** Approved operational states that count as verified (task: status approved/active). */
const APPROVED_STATES = new Set(["approved", "active", "verified"]);

/**
 * Fail-closed verified check. Reads ONLY verified flags:
 * active-likes, approval/status-likes, public-eligibility-likes, review-status-likes,
 * plus an explicit `verified`/`is_verified` passthrough when the caller already
 * resolved the backend flags. Bare entities with no positive signal → false.
 */
export function isVerifiedProvider(provider: unknown): boolean {
  const record = recordOf(provider);
  if (!record) return false;

  for (const key of ACTIVE_KEYS) {
    const value = record[key];
    if (value === false) return false;
  }

  const approvalRaw = text(pick(record, APPROVAL_KEYS));
  if (approvalRaw !== null && !APPROVED_STATES.has(approvalRaw.toLowerCase())) return false;

  const eligibility = pick(record, ELIGIBILITY_KEYS);
  if (eligibility === false) return false;
  if (typeof eligibility === "string" && eligibility.trim().toLowerCase() === "false") return false;

  const reviewRaw = text(pick(record, REVIEW_KEYS));
  if (reviewRaw !== null && reviewRaw.toLowerCase() !== "approved") return false;

  const explicitVerified = pick(record, ["verified", "is_verified", "isVerified"]);
  const hasExplicitVerified = explicitVerified === true;

  const hasApprovalSignal = approvalRaw !== null && APPROVED_STATES.has(approvalRaw.toLowerCase());
  const hasEligibilitySignal = eligibility === true || (typeof eligibility === "string" && eligibility.trim().toLowerCase() === "true");

  return hasExplicitVerified || hasApprovalSignal || hasEligibilitySignal;
}

/** Provider profile paths this badge may link to (canonical pages only). */
const PROVIDER_PATH_PREFIXES = [
  "/doctor/",
  "/facility/",
  "/consultations/doctors",
  "/consultations/clinics",
  "/home-care/providers",
] as const;

function isSafeProviderPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes(" ") || path.includes("\\") || path.includes('"') || path.includes("<")) return false;
  return PROVIDER_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

/** Resolve the canonical badge href, or `null` when no safe provider path is given. */
export function verifiedProviderHref(locale: string, path: string | null | undefined): string | null {
  if (!isLocale(locale)) return null;
  if (typeof path !== "string" || !isSafeProviderPath(path)) return null;
  return localizedUrl(locale as Locale, path);
}

export type VerifiedProviderBadgeProps = {
  /** Raw provider entity (e.g. `data.entity`); only verified flags are read. */
  provider: unknown;
  locale: string;
  /** Canonical provider path, e.g. `/doctor/slug` or `/facility/slug`. */
  path: string;
};

/**
 * "Verified on Nabd+" link snippet. Returns `null` — zero markup — unless the
 * provider carries verified flags AND a safe canonical path resolves.
 */
export function VerifiedProviderBadge({ provider, locale, path }: VerifiedProviderBadgeProps) {
  if (!isVerifiedProvider(provider)) return null;
  const href = verifiedProviderHref(locale, path);
  if (!href) return null;
  const label = locale === "ar" ? "موثّق على نبض بلس" : "Verified on Nabd+";
  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 9999,
        border: "1px solid #E8EDEE",
        background: "rgba(95,217,179,0.15)",
        color: "#1E332E",
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        overflowWrap: "anywhere",
      }}
    >
      <Icon name="check-circle" size={16} tone="mint" />
      <span>{label}</span>
    </Link>
  );
}
