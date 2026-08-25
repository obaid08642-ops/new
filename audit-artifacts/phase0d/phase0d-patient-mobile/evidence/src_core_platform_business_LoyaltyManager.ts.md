# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/business/LoyaltyManager.ts`
- **Member SHA-256:** `7f5d765da85344d277382b6f0aa0262137d77f8a7cade51d77023e3e6ce5c430`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: public async getLoyaltyStatus(userId: string): Promise<Loyalty> {`
- `8: this.log.debug(`Fetching loyalty status for ${userId}`);`
### payment_insurance_relevance
- `2: import { Loyalty, Wallet } from '../../domain/entities';`
- `19: public async getWalletBalance(userId: string): Promise<Wallet> {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
