/**
 * Phase 13, task 13.R5 — the backend half of the user-safe error catalog.
 *
 * Why this exists: the filter used to raise raw English status words (`'Not Found'`),
 * which are neither a stable identifier nor translatable. §2 rule 5 of
 * `docs/review/OPENCODE_PLAN_2026-10-09.md` requires a client-facing failure to carry a
 * **code**, and the reviewer instruction of 2026-10-13 requires that backend copy for
 * such codes live in `i18n.service.ts`. This module owns the code -> HTTP status ->
 * dictionary-key mapping only; the strings themselves stay in the one dictionary so
 * there is a single place to audit.
 *
 * Scope note: this is the backend only. The client half of 13.R5 (mapping these codes
 * onto the five app surfaces) is still outstanding and needs a design decision on
 * whether the clients get a local catalog or resolve keys through this service.
 */
import { HttpStatus } from '@nestjs/common';
import { DICTIONARY, resolveLang } from '../modules/i18n/i18n.service';

/** Stable, machine-readable failure identifiers. Treat these as a published contract. */
export type PlatformErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal_error';

export interface CatalogEntry {
  /** HTTP status this code is raised with. */
  readonly status: number;
  /** Key into the i18n dictionary holding the ar/en/ur copy. */
  readonly i18nKey: string;
  /** Present when there is an action the client can genuinely suggest. */
  readonly nextStep?: string;
}

/**
 * One row per code. The dictionary key must exist in ar, en and ur — the catalog
 * integrity spec asserts that, so a partial translation fails CI rather than shipping.
 */
export const ERROR_CATALOG: Record<PlatformErrorCode, CatalogEntry> = {
  bad_request: { status: HttpStatus.BAD_REQUEST, i18nKey: 'err.bad_request' },
  unauthorized: { status: HttpStatus.UNAUTHORIZED, i18nKey: 'err.unauthorized' },
  forbidden: { status: HttpStatus.FORBIDDEN, i18nKey: 'err.forbidden' },
  not_found: { status: HttpStatus.NOT_FOUND, i18nKey: 'err.not_found' },
  conflict: { status: HttpStatus.CONFLICT, i18nKey: 'err.conflict' },
  internal_error: { status: HttpStatus.INTERNAL_SERVER_ERROR, i18nKey: 'err.internal_error' },
};

export function isPlatformErrorCode(value: unknown): value is PlatformErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ERROR_CATALOG, value);
}

/**
 * Reverse lookup. An unmapped status collapses to `internal_error` rather than
 * echoing the raw status back at the caller, so an unrecognised code can never
 * masquerade as a meaningful one.
 */
export function errorCodeForStatus(status: number): PlatformErrorCode {
  const hit = (Object.keys(ERROR_CATALOG) as PlatformErrorCode[])
    .find((code) => ERROR_CATALOG[code].status === status);
  return hit ?? 'internal_error';
}

export interface PlatformErrorBody {
  statusCode: number;
  code: PlatformErrorCode;
  message: string;
  nextStep?: string;
}

/**
 * Build the wire body for a code. `lang` is resolved through the i18n service, so an
 * unsupported or absent language lands on English rather than returning an empty
 * message. The `code` is always present and always authoritative — clients switch on
 * it, never on the prose.
 */
export function platformErrorBody(
  code: PlatformErrorCode,
  lang?: string | null,
  opts?: { forceMissing?: boolean },
): PlatformErrorBody {
  const entry = ERROR_CATALOG[code] ?? ERROR_CATALOG.internal_error;
  const resolved = resolveLang(lang);
  const fromDict = DICTIONARY[entry.i18nKey];
  // `forceMissing` exists only for the spec: it proves the code survives a lookup miss.
  const message = (opts?.forceMissing ? undefined : fromDict?.[resolved]) ?? '';
  return {
    statusCode: entry.status,
    code,
    message: message || fromDict?.en || code,
    ...(entry.nextStep ? { nextStep: entry.nextStep } : {}),
  };
}