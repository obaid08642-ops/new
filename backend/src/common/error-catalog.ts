/**
 * 13.R5 — shared error-catalog contract (foundation only).
 *
 * Single source of truth mapping platform error codes to localized
 * user-facing messages. Backend, apps, web and MCP all surface these
 * codes; no invented per-client strings for covered cases.
 *
 * Scope: catalog lookup only. Throw sites, guards and filters are owned
 * by a later wave and must not be changed here.
 */
import { ERROR_CODES, R5_ERROR_CODES, isErrorCode, platformError } from './errors';
import MESSAGES from './errors.i18n.json';

export const FALLBACK_CODE = 'UNKNOWN_ERROR' as const;
export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type CatalogCode = (typeof R5_ERROR_CODES)[number] | typeof FALLBACK_CODE;

interface LocalizedEntry {
  message: string;
  nextStep: string;
}

type CatalogTable = Record<string, Partial<Record<SupportedLocale, LocalizedEntry>>>;

const TABLE = MESSAGES as unknown as CatalogTable;

function normalizeLocale(locale: unknown): SupportedLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export function isCatalogCode(code: unknown): code is CatalogCode {
  if (code === FALLBACK_CODE) return true;
  return (R5_ERROR_CODES as readonly string[]).includes(code as string);
}

export function lookupError(
  code: string,
  locale: unknown = DEFAULT_LOCALE,
): { code: string; message: string; nextStep: string } {
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

export function buildPlatformError(
  code: string,
  opts: {
    locale?: unknown;
    message?: string;
    details?: Record<string, unknown>;
    nextStep?: string;
  } = {},
): { code: string; error_code: string; message: string; nextStep: string } & {
  details?: Record<string, unknown>;
} {
  const catalog = lookupError(code, opts.locale);
  const resolvedCode = isCatalogCode(code) ? code : FALLBACK_CODE;
  return {
    code: resolvedCode,
    error_code: resolvedCode,
    message: opts.message ?? catalog.message,
    ...(opts.details ? { details: opts.details } : {}),
    nextStep: opts.nextStep ?? catalog.nextStep,
  };
}

export { ERROR_CODES, R5_ERROR_CODES, isErrorCode, platformError };
