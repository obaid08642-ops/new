/**
 * 13.R5 — admin-side view of the platform error catalog.
 *
 * `errors.i18n.json` is a byte-for-byte copy of
 * `backend/src/common/errors.i18n.json`. The backend owns that file; this copy
 * exists only so the admin BFF client can give an operator a localized message
 * and a next step for transport failures that never reached the backend at all
 * (timeout, offline, DNS). A drift test
 * (`__tests__/error-catalog.parity.test.ts`) fails if the two ever diverge.
 *
 * Only `ar` and `en` exist upstream (`SUPPORTED_LOCALES` in the backend
 * catalogue); anything else falls back to `en`, exactly as `lookupError` does.
 */
import MESSAGES from './errors.i18n.json';

export const FALLBACK_CODE = 'UNKNOWN_ERROR' as const;
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface CatalogEntry {
  code: string;
  message: string;
  nextStep: string;
}

interface LocalizedEntry {
  message: string;
  nextStep: string;
}

const TABLE = MESSAGES as unknown as Record<string, Partial<Record<SupportedLocale, LocalizedEntry>>>;

/** Every code the catalogue can speak. Sorted so drift diffs stay readable. */
export const CATALOG_CODES: readonly string[] = Object.freeze(Object.keys(TABLE).sort());

export function isCatalogCode(code: unknown): code is string {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(TABLE, code);
}

function normalizeLocale(locale: unknown): SupportedLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

/** Mirrors the backend `lookupError`, including its `en` fallback per code. */
export function lookupCatalogError(code: string, locale: unknown = 'ar'): CatalogEntry {
  const lang = normalizeLocale(locale);
  const entry = TABLE[code]?.[lang] ?? TABLE[code]?.en;
  if (entry) return { code, message: entry.message, nextStep: entry.nextStep };
  const fallback = TABLE[FALLBACK_CODE]?.[lang] ?? TABLE[FALLBACK_CODE]?.en;
  return {
    code: FALLBACK_CODE,
    message: fallback?.message ?? 'Something went wrong. Please try again.',
    nextStep: fallback?.nextStep ?? 'If it keeps happening, contact support.',
  };
}

/**
 * HTTP status → catalogue code. Only statuses the catalogue can actually
 * express are mapped; everything else resolves through `FALLBACK_CODE`, which
 * is the backend's own documented behaviour for an unrecognised code.
 */
export function catalogCodeForStatus(status: number): string {
  if (status === 400 || status === 422) return 'INVALID_INPUT';
  if (status === 401) return 'AUTHENTICATION_REQUIRED';
  if (status === 403) return 'INSUFFICIENT_PERMISSION';
  if (status === 409) return 'DUPLICATE_TRANSACTION';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503 || status === 502 || status === 504 || status === 500) return 'SERVICE_UNAVAILABLE';
  return FALLBACK_CODE;
}

/**
 * Pulls the catalogue code out of a backend error body. The backend's global
 * filter normalises to `{ code, message }` (13.R5), so `code` is authoritative;
 * `error_code` is accepted because `buildPlatformError` emits both.
 */
export function catalogCodeFromPayload(payload: unknown, status: number): string {
  const body = payload as { code?: unknown; error_code?: unknown } | null;
  if (isCatalogCode(body?.code)) return body.code;
  if (isCatalogCode(body?.error_code)) return body.error_code;
  return catalogCodeForStatus(status);
}

/** Localized next steps the catalogue has no code for (transport failures). */
export const TRANSPORT_NEXT_STEP: Record<SupportedLocale, string> = {
  ar: 'تحقق من اتصال الإنترنت ثم أعد المحاولة.',
  en: 'Check your connection, then try again.',
};

export const TIMEOUT_NEXT_STEP: Record<SupportedLocale, string> = {
  ar: 'استغرق الطلب وقتاً طويلاً. أعد المحاولة.',
  en: 'The request took too long. Try again.',
};

export const SUPPORT_NEXT_STEP: Record<SupportedLocale, string> = {
  ar: 'إن تكرر الخطأ، تواصل مع الدعم الفني مع ذكر معرّف الخطأ.',
  en: 'If this keeps happening, contact support and quote the error id.',
};