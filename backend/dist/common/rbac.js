"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOM_ROLE_KEY_RE = exports.ReasonError = exports.MIN_FINANCIAL_REASON_LENGTH = exports.MIN_REASON_LENGTH = exports.ROLE_HIERARCHY = void 0;
exports.roleSatisfies = roleSatisfies;
exports.validateReason = validateReason;
exports.isFinancialReasonValid = isFinancialReasonValid;
exports.mergePermissions = mergePermissions;
exports.sanitizePermissions = sanitizePermissions;
exports.ROLE_HIERARCHY = {
    super_admin: ['super_admin', 'admin'],
    admin: ['admin'],
};
function roleSatisfies(required, effective) {
    const req = String(required || '').trim().toLowerCase();
    if (!req)
        return false;
    return (effective || []).some((r) => {
        const role = String(r || '').trim().toLowerCase();
        if (!role)
            return false;
        const chain = exports.ROLE_HIERARCHY[role] || [role];
        return chain.includes(req);
    });
}
exports.MIN_REASON_LENGTH = 5;
exports.MIN_FINANCIAL_REASON_LENGTH = 10;
const common_1 = require("@nestjs/common");
class ReasonError extends common_1.BadRequestException {
    constructor(code) {
        super(code);
        this.code = code;
    }
}
exports.ReasonError = ReasonError;
function validateReason(raw, min = exports.MIN_REASON_LENGTH) {
    const reason = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!reason)
        throw new ReasonError('reason_required');
    if (reason.length < min)
        throw new ReasonError(`reason_too_short_min_${min}`);
    return reason;
}
function isFinancialReasonValid(raw) {
    try {
        validateReason(raw, exports.MIN_FINANCIAL_REASON_LENGTH);
        return true;
    }
    catch {
        return false;
    }
}
function mergePermissions(...groups) {
    const out = new Set();
    for (const g of groups)
        for (const p of g || [])
            if (p)
                out.add(p);
    return [...out];
}
function sanitizePermissions(candidate, catalog) {
    const allowed = new Set(catalog);
    if (!Array.isArray(candidate))
        return [];
    return [...new Set(candidate.map(String).filter((p) => allowed.has(p)))];
}
exports.CUSTOM_ROLE_KEY_RE = /^[a-z0-9_-]{3,40}$/;
//# sourceMappingURL=rbac.js.map