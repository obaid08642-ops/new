import { EMBEDDED_POLICIES, type EmbeddedPolicy } from "@/lib/legal/embedded-policies";
import { readLegalPolicy, type LegalPolicy, type PolicyKey } from "@/lib/api/legal-policy";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";

/**
 * Issue 755/783: /terms and /privacy stay public. The text comes from the legal service; ONLY when the service cannot be
 * reached (and there is no cached copy of the page) the page shows the embedded copy of the official text instead
 * (lib/legal/embedded-policies.ts, generated from docs/legal).
 *
 * Owner decision 2026-10-10: the legal paperwork comes after the project, so the fallback is ON with the CURRENT published text
 * (docs/legal), shown as "the current version" (`current: true`, the page says so). The lawyer-approved text replaces it before
 * launch: update docs/legal, run scripts/embed-legal-policies.mjs and the label disappears with the draft marker.
 */
export function isPublishable(policy: EmbeddedPolicy): boolean {
  return policy.content.trim().length > 0;
}

/** The embedded official text for a page language: that language when it has one, else Arabic; null when not publishable. */
export function embeddedLegalPolicy(key: PolicyKey, locale: string): (LegalPolicy & { lang: "ar" | "en"; current: boolean }) | null {
  const texts = EMBEDDED_POLICIES[key];
  const lang: "ar" | "en" = locale === "ar" ? "ar" : texts.en ? "en" : "ar";
  const policy = texts[lang];
  if (!policy || !isPublishable(policy)) return null;
  return { content: policy.content, version: policy.version, effective_date: policy.effective_date, lang, current: policy.draft };
}

/** The policy from the service, or the embedded copy when the service cannot be reached; `null` = no such policy (404). */
export async function readLegalPolicyOrEmbedded(
  key: PolicyKey,
  locale: string,
  read: typeof readLegalPolicy = readLegalPolicy,
): Promise<(LegalPolicy & { lang?: "ar" | "en"; current?: boolean }) | null> {
  try {
    return await read(key, locale);
  } catch (error) {
    if (!(error instanceof PublicDataUnavailableError)) throw error;
    const embedded = embeddedLegalPolicy(key, locale);
    if (!embedded) throw error;
    return embedded;
  }
}
