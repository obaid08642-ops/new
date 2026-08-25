# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/auth/AuthManager.ts`
- **Member SHA-256:** `bf25d0ac452a92439600a64945bff45253afa35e2575c598bc8d0048012b4c9f`
- **Line count:** 102
- **Read range:** `1-102`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: public registerProvider(provider: AuthProvider): void {`
- `44: public async loginWithProvider(providerId: string, credentials?: any): Promise<AuthResult> {`
- `51: this.log.info(`Attempting login with ${providerId}`);`
- `52: const result = await provider.login(credentials);`
- `56: logAuditEvent('LOGIN_SUCCESS', { provider: providerId, userId: result.user.id });`
- `59: logAuditEvent('LOGIN_FAILED', { provider: providerId, error: (err as Error).message });`
- `64: public async logout(): Promise<void> {`
- `67: // Attempt to logout from all providers`
- `70: provider.logout().catch(err => {`
- `71: this.log.error(`Failed to logout from provider ${provider.id}`, err);`
- `78: logAuditEvent('LOGOUT', { userId: this.currentUser?.id ?? 'unknown' });`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: const AUTH_SESSION_KEY = 'app_auth_session';`
- `37: this.log.info('Restored user session', { userId: this.currentUser.id });`
- `40: this.log.error('Failed to restore session', err);`
- `44: public async loginWithProvider(providerId: string, credentials?: any): Promise<AuthResult> {`
- `45: const provider = this.providers.get(providerId);`
- `47: throw new Error(`Auth provider ${providerId} not found`);`
- `51: this.log.info(`Attempting login with ${providerId}`);`
- `52: const result = await provider.login(credentials);`
- `54: await this.setSession(result);`
- `56: logAuditEvent('LOGIN_SUCCESS', { provider: providerId, userId: result.user.id });`
- `59: logAuditEvent('LOGIN_FAILED', { provider: providerId, error: (err as Error).message });`
- `64: public async logout(): Promise<void> {`
### state_transitions
- `27: this.log.error(`Failed to initialize provider ${provider.id}`, err);`
- `40: this.log.error('Failed to restore session', err);`
- `47: throw new Error(`Auth provider ${providerId} not found`);`
- `56: logAuditEvent('LOGIN_SUCCESS', { provider: providerId, userId: result.user.id });`
- `59: logAuditEvent('LOGIN_FAILED', { provider: providerId, error: (err as Error).message });`
- `71: this.log.error(`Failed to logout from provider ${provider.id}`, err);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `26: provider.initialize().catch(err => {`
- `27: this.log.error(`Failed to initialize provider ${provider.id}`, err);`
- `39: } catch (err) {`
- `40: this.log.error('Failed to restore session', err);`
- `47: throw new Error(`Auth provider ${providerId} not found`);`
- `58: } catch (err) {`
- `59: logAuditEvent('LOGIN_FAILED', { provider: providerId, error: (err as Error).message });`
- `70: provider.logout().catch(err => {`
- `71: this.log.error(`Failed to logout from provider ${provider.id}`, err);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
