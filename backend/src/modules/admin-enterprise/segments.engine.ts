/**
 * A4-extension — Dynamic segments builder.
 *
 * A segment is a JSON filter DSL compiled into a Mongo query for the `users`
 * collection (patients). The compiler is a PURE function (unit-tested) so the
 * exact same logic powers: live count, member listing, and campaign targeting.
 *
 * DSL shape:
 * { match: 'all' | 'any', rules: Rule[] }
 * Rule = { field, op, value? } with field dotted paths allowed.
 * ops: eq | ne | gt | gte | lt | lte | contains | in | exists | between
 */

export type SegmentOp =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'in' | 'exists' | 'between';

export interface SegmentRule {
  field: string;
  op: SegmentOp;
  value?: any;
  /** second bound for `between` */
  value2?: any;
}

export interface SegmentDefinition {
  match?: 'all' | 'any';
  rules: SegmentRule[];
}

/** Whitelisted user fields that may be targeted (privacy fence). */
export const SEGMENT_ALLOWED_FIELDS: readonly string[] = [
  'role', 'verified', 'is_guest', 'active',
  'city', 'language',
  'createdAt', 'last_login_at',
  'loyalty_points', 'wallet_balance',
  'bookings_total', 'orders_total', 'appointments_total',
  'acquisition_source', 'source',
];

export function isAllowedField(field: string): boolean {
  return SEGMENT_ALLOWED_FIELDS.includes(String(field || '').trim());
}

const DATE_FIELDS = new Set(['createdAt', 'last_login_at']);

/** Compile one rule into a Mongo condition (pure). */
export function compileRule(rule: SegmentRule): Record<string, any> {
  const field = String(rule?.field || '').trim();
  const op = rule?.op;
  const v = rule?.value;
  switch (op) {
    case 'eq': return { [field]: normalize(field, v) };
    case 'ne': return { [field]: { $ne: normalize(field, v) } };
    case 'gt': return { [field]: { $gt: normalize(field, v) } };
    case 'gte': return { [field]: { $gte: normalize(field, v) } };
    case 'lt': return { [field]: { $lt: normalize(field, v) } };
    case 'lte': return { [field]: { $lte: normalize(field, v) } };
    case 'contains': return { [field]: { $regex: escapeRx(String(v ?? '')), $options: 'i' } };
    case 'in': return { [field]: { $in: Array.isArray(v) ? v.map((x) => normalize(field, x)) : [normalize(field, v)] } };
    case 'exists': return { [field]: { $exists: !!v } };
    case 'between': {
      const [a, b] = [normalize(field, rule.value), normalize(field, rule.value2)];
      const lo = DATE_FIELDS.has(field)
        ? new Date(Math.min(new Date(a).getTime(), new Date(b).getTime()))
        : Math.min(Number(a), Number(b));
      const hi = DATE_FIELDS.has(field)
        ? new Date(Math.max(new Date(a).getTime(), new Date(b).getTime()))
        : Math.max(Number(a), Number(b));
      return { [field]: { $gte: lo, $lte: hi } };
    }
    default:
      throw new Error(`unsupported_op:${op}`);
  }
}

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(field: string, v: any) {
  if (!DATE_FIELDS.has(field)) return v;
  try { return new Date(v); } catch { return v; }
}

/**
 * Compile the whole definition into a Mongo filter for the users collection.
 * Throws on unknown fields (privacy fence) or malformed rules.
 */
export function compileSegment(def: SegmentDefinition): Record<string, any> {
  if (!def || !Array.isArray(def.rules) || def.rules.length === 0) {
    throw new Error('segment_rules_required');
  }
  for (const r of def.rules) {
    if (!isAllowedField(r?.field)) throw new Error(`forbidden_field:${r?.field}`);
  }
  const conditions = def.rules.map(compileRule);
  if (conditions.length === 1) return { role: 'patient', ...conditions[0] };
  if ((def.match || 'all') === 'all') return { role: 'patient', $and: conditions };
  return { role: 'patient', $or: conditions };
}
