"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODE_REGISTRY_DRAFT = exports.CONSENT_SCOPES = exports.PHASE6_CONTRACT_STATUS = void 0;
exports.assertPhase6ContractInactive = assertPhase6ContractInactive;
const common_1 = require("@nestjs/common");
exports.PHASE6_CONTRACT_STATUS = 'DRAFT_NOT_ACTIVE';
exports.CONSENT_SCOPES = [
    'care:read',
    'care:write',
    'documents:read',
    'location:share:emergency',
    'notifications:receive',
];
exports.ERROR_CODE_REGISTRY_DRAFT = Object.freeze({
    AUTH_OTP_EXPIRED: { category: 'authentication', http_status: 401, retryable: false },
    AUTH_FORBIDDEN: { category: 'authorization', http_status: 403, retryable: false },
    AUTH_NOT_PARTICIPANT: { category: 'authorization', http_status: 403, retryable: false },
    RESOURCE_NOT_FOUND: { category: 'resource', http_status: 404, retryable: false },
    PAYMENT_WEBHOOK_INVALID: { category: 'payment', http_status: 400, retryable: false },
    SECURITY_REPLAY_DETECTED: { category: 'security', http_status: 409, retryable: false },
    CONSENT_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
    QR_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
    EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE: { category: 'contract', http_status: 501, retryable: false },
});
function assertPhase6ContractInactive(contract) {
    const code = contract === 'CONSENT_CONTRACT_NOT_ACTIVE'
        ? 'CONSENT_CONTRACT_NOT_ACTIVE'
        : contract === 'QR_CONTRACT_NOT_ACTIVE'
            ? 'QR_CONTRACT_NOT_ACTIVE'
            : contract === 'EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE'
                ? 'EMERGENCY_LOCATION_CONTRACT_NOT_ACTIVE'
                : contract;
    throw new common_1.NotImplementedException(code);
}
//# sourceMappingURL=phase6-contracts.js.map