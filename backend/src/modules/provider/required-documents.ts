import { REQUIRED_DOCS_BY_PROVIDER_TYPE } from './provider.enums';
import { DocumentReviewStatus } from './schemas';

/** Review states that do not prove a document (stored lowercase, see DocumentReviewStatus). */
const NOT_EVIDENCE: ReadonlySet<string> = new Set([DocumentReviewStatus.REJECTED, DocumentReviewStatus.NEEDS_REPLACEMENT]);

/**
 * Q80: the one approval rule for both approve paths. Only a typed
 * provider_documents row counts, and only while it is not rejected or
 * flagged for replacement. URL strings on the profile are not evidence.
 */
export function missingRequiredDocuments(
  providerType: string | undefined,
  docs: ReadonlyArray<{ doc_type?: string; review_status?: string }>,
): string[] {
  const required: string[] = (REQUIRED_DOCS_BY_PROVIDER_TYPE as Record<string, string[]>)[String(providerType)] || [];
  const ok = new Set(
    docs.filter((d) => !NOT_EVIDENCE.has(String(d.review_status || '').toLowerCase())).map((d) => String(d.doc_type)),
  );
  return required.filter((r) => !ok.has(r));
}
