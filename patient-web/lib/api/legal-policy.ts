import { readPublicEntity } from "@/lib/api/public-read";
import { patientApiUrl } from "@/lib/api/upstream";

/** The policies the patient site shows (D-38): terms, privacy, the cancellation and refund policy, the telehealth consent. */
export type PolicyKey = "patient_terms" | "privacy_policy" | "refund_policy" | "telehealth_consent";
export type LegalPolicy = { content?: string | null; version?: string | number | null; effective_date?: string | null };

/**
 * A policy of the legal service (`GET /legal/policy/:key?lang=`, public) for a page language: the service holds Arabic and
 * English, every other language reads the English text. 4xx (no such policy): `null`; no answer or 5xx: throws (public-read.ts).
 */
export function readLegalPolicy(key: PolicyKey, locale: string) {
  const lang = locale === "ar" ? "ar" : "en";
  // The server-side API base like every other server read (NABD_API_BASE_URL): the live gate reads its own backend.
  return readPublicEntity<LegalPolicy>(patientApiUrl(`/legal/policy/${key}?lang=${lang}`), 3600);
}
