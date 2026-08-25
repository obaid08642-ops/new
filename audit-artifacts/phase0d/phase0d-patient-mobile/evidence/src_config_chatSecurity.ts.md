# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/config/chatSecurity.ts`
- **Member SHA-256:** `d917d679a39c6338352adaca55c9d68a768f0e4c8761277ef90e80c53b952787`
- **Line count:** 150
- **Read range:** `1-150`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: // Controls session lifecycle, message restrictions, and audit logging.`
- `6: export interface ChatSession {`
- `9: patientId: string;`
- `10: providerId: string;`
- `18: // Session durations by type (in milliseconds)`
- `31: // Grace period after session ends where messages can still be read`
- `35: * Check if a chat session allows sending new messages`
- `37: export function canSendMessage(session: ChatSession): boolean {`
- `38: if (!session.isActive) return false;`
- `39: if (session.isReadOnly) return false;`
- `40: return Date.now() < session.expiresAt;`
- `44: * Check if a chat session can be read (viewed)`
### state_transitions
- `117: | 'PRICE_CONFIRMED'`
- `118: | 'PRICE_REJECTED'`
### payment_insurance_relevance
- `117: | 'PRICE_CONFIRMED'`
- `118: | 'PRICE_REJECTED'`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
