/**
 * 13.R5 / 15.1 — the platform error catalog, on the client.
 *
 * `errors.i18n.json` is a verbatim copy of `backend/src/common/errors.i18n.json`,
 * the backend's single source of truth. It is copied (not re-typed) so the
 * client never invents a message for a code the backend can emit, and so the
 * catalogue can be regenerated from the backend without touching code.
 *
 * Why a copy and not a shared workspace package: the app bundles for iOS and
 * Android through Metro, which cannot import from `backend/`, and the backend
 * cannot be edited from this app slice. A build-time copy check
 * (`errorCatalog.parity.test.ts`) fails the suite if the two files drift.
 *
 * The backend catalogue ships `ar` + `en` only. The app ships six locales, so a
 * requested locale falls back to `ar` (the app default) rather than leaking an
 * English string into an Arabic UI. `resolveCatalogLocale` is the single place
 * that decision is made.
 *
 * This module is intentionally free of React and react-native imports so the
 * network layer can be imported by plain unit tests.
 */
import CATALOG_JSON from './errors.i18n.json';

export type BackendErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'INSUFFICIENT_PERMISSION'
  | 'PRESCRIPTION_REQUIRED'
  | 'NO_AVAILABILITY'
  | 'SERVICE_UNAVAILABLE'
  | 'PROVIDER_NOT_AVAILABLE'
  | 'PRODUCT_OUT_OF_STOCK'
  | 'PAYMENT_REQUIRED'
  | 'INSURANCE_NOT_SUPPORTED'
  | 'LOCATION_NOT_SUPPORTED'
  | 'DUPLICATE_TRANSACTION'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

export type CatalogLocale = string;

export interface LocalizedEntry {
  message: string;
  nextStep: string;
}

type RawCatalog = Record<string, Partial<Record<CatalogLocale, LocalizedEntry>>>;

export const ERROR_CATALOG = CATALOG_JSON as unknown as Record<BackendErrorCode, Record<CatalogLocale, LocalizedEntry>>;

export const BACKEND_ERROR_CODES = Object.keys(ERROR_CATALOG) as BackendErrorCode[];

/** Locales the copied catalogue actually carries. */
export const CATALOG_LOCALES: CatalogLocale[] = Array.from(
  new Set(BACKEND_ERROR_CODES.flatMap((code) => Object.keys(ERROR_CATALOG[code]))),
);

const FALLBACK_LOCALE: CatalogLocale = 'ar';

/**
 * Pick the catalogue locale to render. Unsupported locales (the app ships six,
 * the catalogue carries two) resolve to the Arabic default so an Urdu or
 * Bengali user is never shown an untranslated English sentence.
 */
export function resolveCatalogLocale(locale: string | undefined | null): CatalogLocale {
  if (!locale) return FALLBACK_LOCALE;
  const tag = String(locale).trim().toLowerCase();
  if (!tag) return FALLBACK_LOCALE;
  if (CATALOG_LOCALES.includes(tag)) return tag;
  const base = tag.split(/[-_]/)[0];
  if (CATALOG_LOCALES.includes(base)) return base;
  return FALLBACK_LOCALE;
}

/** Legacy `error_code` spellings the backend has used for the same conditions. */
const CODE_ALIASES: Record<string, BackendErrorCode> = {
  UNAUTHORIZED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'INSUFFICIENT_PERMISSION',
  UNAUTHORIZED_EXCEPTION: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN_EXCEPTION: 'INSUFFICIENT_PERMISSION',
  VALIDATION_FAILED: 'INVALID_INPUT',
  BAD_REQUEST: 'INVALID_INPUT',
  TOO_MANY_REQUESTS: 'RATE_LIMITED',
  THROTTLED: 'RATE_LIMITED',
  OUT_OF_STOCK: 'PRODUCT_OUT_OF_STOCK',
  SLOT_TAKEN: 'NO_AVAILABILITY',
  PAYMENT_FAILED: 'PAYMENT_REQUIRED',
  INTERNAL_SERVER_ERROR: 'SERVICE_UNAVAILABLE',
  BAD_GATEWAY: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'SERVICE_UNAVAILABLE',
};

export function isCatalogCode(raw: unknown): raw is BackendErrorCode {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(ERROR_CATALOG, raw.trim().toUpperCase());
}

/**
 * Resolve any server-supplied code (UPPER_SNAKE from the catalogue, or a
 * lower_snake alias) to a catalogue code. Returns null for codes the catalogue
 * does not cover so callers can fall back to UNKNOWN_ERROR rather than
 * inventing a message.
 */
export function normalizeCatalogCode(raw: unknown): BackendErrorCode | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (isCatalogCode(upper)) return upper as BackendErrorCode;
  const alias = CODE_ALIASES[upper];
  if (alias) return alias;
  const snake = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  for (const [code, entry] of Object.entries(CODE_ALIASES)) {
    if (code.toLowerCase() === snake) return entry;
  }
  return null;
}

export interface CatalogEntry {
  code: BackendErrorCode;
  /** The catalogue's own message, before any server override. */
  message: string;
  nextStep: string;
  locale: CatalogLocale;
  /** True when the requested locale had no catalogue entry and `ar` was used. */
  usedFallbackLocale: boolean;
}

/**
 * Look up a catalogue entry. `serverMessage` / `serverNextStep` win when the
 * backend sends them, because the backend knows more about *this* failure than
 * a static catalogue entry does.
 */
export function lookupCatalogEntry(
  code: BackendErrorCode,
  locale?: string | null,
  overrides?: { message?: string; nextStep?: string },
): CatalogEntry {
  const requested = String(locale ?? '').trim().toLowerCase();
  const resolved = resolveCatalogLocale(requested || undefined);
  const localized = ERROR_CATALOG[code]?.[resolved] ?? ERROR_CATALOG[code]?.[FALLBACK_LOCALE];
  return {
    code,
    message: overrides?.message || localized.message,
    nextStep: overrides?.nextStep || localized.nextStep,
    locale: resolved,
    usedFallbackLocale: !!requested && resolved !== requested,
  };
}

/**
 * Map an HTTP status to a catalogue code when the body carries none. Ordering is
 * most-specific first so 429 does not get swallowed by the 5xx branch.
 */
export function catalogCodeForStatus(status: number): BackendErrorCode {
  if (status === 401) return 'AUTHENTICATION_REQUIRED';
  if (status === 403) return 'INSUFFICIENT_PERMISSION';
  if (status === 404) return 'UNKNOWN_ERROR';
  if (status === 409) return 'DUPLICATE_TRANSACTION';
  if (status === 422) return 'INVALID_INPUT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  if (status >= 400) return 'INVALID_INPUT';
  return 'UNKNOWN_ERROR';
}
