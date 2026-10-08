import { readPublicEntity } from "@/lib/api/public-read";

export type PolicyKey = "patient_terms" | "privacy_policy";
export type LegalPolicy = { content?: string | null; version?: string | number | null; effective_date?: string | null };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

/**
 * A policy of the legal service (`GET /legal/policy/:key?lang=`, public) for a page language: the service holds Arabic and
 * English, every other language reads the English text. 4xx (no such policy): `null`; no answer or 5xx: throws (public-read.ts).
 */
export function readLegalPolicy(key: PolicyKey, locale: string) {
  const lang = locale === "ar" ? "ar" : "en";
  return readPublicEntity<LegalPolicy>(`${API_BASE}/api/v1/legal/policy/${key}?lang=${lang}`, 3600);
}
