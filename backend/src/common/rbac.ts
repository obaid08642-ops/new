/**
 * A1 security foundation — pure RBAC primitives.
 *
 * Kept free of NestJS/DI dependencies so the hierarchy and reason rules are
 * unit-testable without a database or HTTP context.
 *
 * Hierarchy contract:
 *   super_admin ⊇ admin ⊇ nothing else implicit. Every other role maps to
 *   itself only (provider roles must never inherit admin powers).
 */

export const ROLE_HIERARCHY: Record<string, string[]> = {
  super_admin: ['super_admin', 'admin'],
  admin: ['admin'],
};

/** True when ANY of `effective` satisfies the single `required` role. */
export function roleSatisfies(required: string | undefined | null, effective: Array<string | undefined | null>): boolean {
  const req = String(required || '').trim().toLowerCase();
  if (!req) return false;
  return (effective || []).some((r) => {
    const role = String(r || '').trim().toLowerCase();
    if (!role) return false;
    const chain = ROLE_HIERARCHY[role] || [role];
    return chain.includes(req);
  });
}

/** Minimum accepted length for a destructive-action reason (plan §2). */
export const MIN_REASON_LENGTH = 5;
/** Money-moving decisions demand a longer justification. */
export const MIN_FINANCIAL_REASON_LENGTH = 10;

import { BadRequestException } from '@nestjs/common';

/**
 * Thrown by validateReason — inherits BadRequestException so EVERY throw maps
 * to HTTP 400 natively, no try/catch translation needed at call sites.
 */
export class ReasonError extends BadRequestException {
  constructor(public readonly code: string) {
    super(code);
  }
}

/**
 * Validates and normalizes a mandatory reason string.
 * Throws ReasonError (caller maps to BadRequestException) when missing/too short.
 */
export function validateReason(raw: unknown, min = MIN_REASON_LENGTH): string {
  const reason = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!reason) throw new ReasonError('reason_required');
  if (reason.length < min) throw new ReasonError(`reason_too_short_min_${min}`);
  return reason;
}

export function isFinancialReasonValid(raw: unknown): boolean {
  try {
    validateReason(raw, MIN_FINANCIAL_REASON_LENGTH);
    return true;
  } catch {
    return false;
  }
}

/** Dedupe union of permission lists. */
export function mergePermissions(...groups: Array<string[] | undefined | null>): string[] {
  const out = new Set<string>();
  for (const g of groups) for (const p of g || []) if (p) out.add(p);
  return [...out];
}

/** Whitelist filter — keeps only permissions that exist in the catalog. */
export function sanitizePermissions(candidate: unknown, catalog: readonly string[]): string[] {
  const allowed = new Set(catalog);
  if (!Array.isArray(candidate)) return [];
  return [...new Set(candidate.map(String).filter((p) => allowed.has(p)))];
}

export const CUSTOM_ROLE_KEY_RE = /^[a-z0-9_-]{3,40}$/;
