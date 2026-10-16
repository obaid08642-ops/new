import { readLegalPolicyOrEmbedded } from "@/lib/legal/embedded";
import { parseLegal, type LegalBlock } from "@/lib/legal/parse-legal";

/** The telehealth consent as the booking forms show it before the first online consultation (D-38). */
export type TelehealthConsentText = { blocks: LegalBlock[]; version: string | null; lang: "ar" | "en" };

/**
 * The current telehealth consent for a page language, read like the /telehealth-consent page (the legal service, the
 * embedded official text when the service cannot be reached). `null` when there is none to show: the booking then still
 * asks for the acceptance when the server refuses, and links the full page.
 */
export async function readTelehealthConsent(locale: string): Promise<TelehealthConsentText | null> {
  try {
    const policy = await readLegalPolicyOrEmbedded("telehealth_consent", locale);
    if (!policy?.content) return null;
    const version = policy.version !== undefined && policy.version !== null && policy.version !== "" ? String(policy.version) : null;
    return { blocks: parseLegal(policy.content), version, lang: policy.lang ?? (locale === "ar" ? "ar" : "en") };
  } catch {
    return null;
  }
}
