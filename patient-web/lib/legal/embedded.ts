import { EMBEDDED_POLICIES, type EmbeddedPolicy } from "@/lib/legal/embedded-policies";
import { readLegalPolicy, type LegalPolicy, type PolicyKey } from "@/lib/api/legal-policy";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";

/**
 * Issue 755/783: /terms and /privacy stay public. The text comes from the legal service; ONLY when the service cannot be
 * reached (and there is no cached copy of the page) the page shows the embedded copy of the official text instead
 * (lib/legal/embedded-policies.ts, generated from docs/legal).
 *
 * The embedded copy is used only when it is publishable: not marked as a draft and with no unfilled [placeholder]. The texts
 * in docs/legal are drafts until a Saudi lawyer approves them (docs/legal/README.md), so until then an outage still shows the
 * "unavailable" page instead of an unapproved legal text. Approving the texts and running scripts/embed-legal-policies.mjs
 * turns the fallback on with no code change.
 */
export function isPublishable(policy: EmbeddedPolicy): boolean {
  return !policy.draft && !/\[[^\]]*\]/.test(policy.content) && policy.content.trim().length > 0;
}

/** The embedded official text for a page language: that language when it has one, else Arabic; null when not publishable. */
export function embeddedLegalPolicy(key: PolicyKey, locale: string): (LegalPolicy & { lang: "ar" | "en" }) | null {
  const texts = EMBEDDED_POLICIES[key];
  const lang: "ar" | "en" = locale === "ar" ? "ar" : texts.en ? "en" : "ar";
  const policy = texts[lang];
  if (!policy || !isPublishable(policy)) return null;
  return { content: policy.content, version: policy.version, effective_date: policy.effective_date, lang };
}

/** The policy from the service, or the embedded copy when the service cannot be reached; `null` = no such policy (404). */
export async function readLegalPolicyOrEmbedded(
  key: PolicyKey,
  locale: string,
  read: typeof readLegalPolicy = readLegalPolicy,
): Promise<(LegalPolicy & { lang?: "ar" | "en" }) | null> {
  try {
    return await read(key, locale);
  } catch (error) {
    if (!(error instanceof PublicDataUnavailableError)) throw error;
    const embedded = embeddedLegalPolicy(key, locale);
    if (!embedded) throw error;
    return embedded;
  }
}
