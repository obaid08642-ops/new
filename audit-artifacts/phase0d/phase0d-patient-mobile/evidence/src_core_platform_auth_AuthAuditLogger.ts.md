# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/AuthAuditLogger.ts`
- **Member SHA-256:** `d62e50f6791b2a182139cc0004ba6e00ca375263718e0e9fec60dbd40cfe38ce`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: public async logLoginSuccess(userId: string, deviceId: string, sessionId: string, method: string): Promise<void> {`
- `10: this.log.info(`Logging successful login for user ${userId}`);`
- `11: this.auditManager.logAction('USER_LOGIN', userId, {`
- `20: public async logLoginFailed(identifier: string, deviceId: string, reason: string, method: string): Promise<void> {`
- `21: this.log.warn(`Logging failed login for ${identifier}: ${reason}`);`
- `22: this.auditManager.logAction('LOGIN_FAILED', 'UNKNOWN', {`
- `32: public async logLogout(userId: string, deviceId: string, sessionId: string, reason: string): Promise<void> {`
- `33: this.log.info(`Logging logout for user ${userId}. Reason: ${reason}`);`
- `34: this.auditManager.logAction('USER_LOGOUT', userId, {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: public async logLoginSuccess(userId: string, deviceId: string, sessionId: string, method: string): Promise<void> {`
- `10: this.log.info(`Logging successful login for user ${userId}`);`
- `11: this.auditManager.logAction('USER_LOGIN', userId, {`
- `13: sessionId,`
- `20: public async logLoginFailed(identifier: string, deviceId: string, reason: string, method: string): Promise<void> {`
- `21: this.log.warn(`Logging failed login for ${identifier}: ${reason}`);`
- `22: this.auditManager.logAction('LOGIN_FAILED', 'UNKNOWN', {`
- `32: public async logLogout(userId: string, deviceId: string, sessionId: string, reason: string): Promise<void> {`
- `33: this.log.info(`Logging logout for user ${userId}. Reason: ${reason}`);`
- `34: this.auditManager.logAction('USER_LOGOUT', userId, {`
- `36: sessionId,`
### state_transitions
- `9: public async logLoginSuccess(userId: string, deviceId: string, sessionId: string, method: string): Promise<void> {`
- `10: this.log.info(`Logging successful login for user ${userId}`);`
- `20: public async logLoginFailed(identifier: string, deviceId: string, reason: string, method: string): Promise<void> {`
- `21: this.log.warn(`Logging failed login for ${identifier}: ${reason}`);`
- `22: this.auditManager.logAction('LOGIN_FAILED', 'UNKNOWN', {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: public async logLoginFailed(identifier: string, deviceId: string, reason: string, method: string): Promise<void> {`
- `21: this.log.warn(`Logging failed login for ${identifier}: ${reason}`);`
- `22: this.auditManager.logAction('LOGIN_FAILED', 'UNKNOWN', {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
