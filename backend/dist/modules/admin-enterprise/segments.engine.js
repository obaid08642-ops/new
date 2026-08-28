"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEGMENT_ALLOWED_FIELDS = void 0;
exports.isAllowedField = isAllowedField;
exports.compileRule = compileRule;
exports.compileSegment = compileSegment;
exports.SEGMENT_ALLOWED_FIELDS = [
    'role', 'verified', 'is_guest', 'active',
    'city', 'language',
    'createdAt', 'last_login_at',
    'loyalty_points', 'wallet_balance',
    'bookings_total', 'orders_total', 'appointments_total',
    'acquisition_source', 'source',
];
function isAllowedField(field) {
    return exports.SEGMENT_ALLOWED_FIELDS.includes(String(field || '').trim());
}
const DATE_FIELDS = new Set(['createdAt', 'last_login_at']);
function compileRule(rule) {
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
function escapeRx(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalize(field, v) {
    if (!DATE_FIELDS.has(field))
        return v;
    try {
        return new Date(v);
    }
    catch {
        return v;
    }
}
function compileSegment(def) {
    if (!def || !Array.isArray(def.rules) || def.rules.length === 0) {
        throw new Error('segment_rules_required');
    }
    for (const r of def.rules) {
        if (!isAllowedField(r?.field))
            throw new Error(`forbidden_field:${r?.field}`);
    }
    const conditions = def.rules.map(compileRule);
    if (conditions.length === 1)
        return { role: 'patient', ...conditions[0] };
    if ((def.match || 'all') === 'all')
        return { role: 'patient', $and: conditions };
    return { role: 'patient', $or: conditions };
}
//# sourceMappingURL=segments.engine.js.map