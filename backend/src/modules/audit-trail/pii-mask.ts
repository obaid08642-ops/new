/**
 * Phase 23.4 — PII masking for audit reads (pure function, no Nest/DB deps).
 *
 * Only the owner (and explicitly named roles) may see full details.
 * Everyone else gets phone / email / national-ID values masked, while the
 * events themselves (actions, entity refs, timestamps) stay intact so the
 * timeline remains useful.
 */

const SENSITIVE_KEY = /phone|mobile|msisdn|email|national[_-]?id|iqama|passport|nid/i;
const MASKED = '***masked***';

/**
 * Roles that may see full (unmasked) audit details. `super_admin` is the
 * platform owner. Extra roles (e.g. `legal`, `dpo`) are opt-in via the
 * AUDIT_FULL_PII_ROLES env var (comma-separated) — set by owner/lawyer.
 */
export function fullPiiRoles(): string[] {
  const extra = String(process.env.AUDIT_FULL_PII_ROLES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return ['super_admin', 'owner', ...extra];
}

export function canSeeFullPii(viewerRole: unknown): boolean {
  return fullPiiRoles().includes(String(viewerRole || '').toLowerCase());
}

function maskValue(key: string, value: unknown, depth: number): unknown {
  if (depth > 8) return MASKED;
  if (Array.isArray(value)) return value.map((v) => maskValue(key, v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = maskValue(k, (value as Record<string, unknown>)[k], depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && SENSITIVE_KEY.test(key)) {
    if (key.toLowerCase().includes('email') && value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (value.length <= 4) return MASKED;
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  return value;
}

/** Deep-clone + mask. Pass-through (same shape) when the viewer may see full PII. */
export function maskAuditEventForViewer<T>(event: T, viewerRole: unknown): T {
  if (canSeeFullPii(viewerRole)) return event;
  const clone = JSON.parse(JSON.stringify(event ?? null));
  return maskValue('', clone, 0) as T;
}
