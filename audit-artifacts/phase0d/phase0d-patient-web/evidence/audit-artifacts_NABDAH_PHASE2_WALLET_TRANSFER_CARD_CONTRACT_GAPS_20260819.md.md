# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_WALLET_TRANSFER_CARD_CONTRACT_GAPS_20260819.md`
- **Member SHA-256:** `a4860e48120715fa1b67c4823d781aed001ecefa2c3b4c52e6a0994cc593da16`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Saved-card screen adds hard-coded, non-tokenized cards | Tapping “add card” submits fixed Visa/Mada numbers, holder `Ahmed`, and expiries. Backend keeps only last four digits, but has no payment-gateway token/reference or verific`
- `13: | **P0** | Transfer retries can duplicate a financial operation | Client has no submit lock/idempotency key and Backend has no idempotency/replay contract. Network failure after a committed transfer can lead a patient to resubmit. | Require`
- `14: | **P1** | Transfer input is unsupported on Android | Screen uses `Alert.prompt` twice; React Native supports it only on iOS, so transfer cannot be completed on Android. | Replace with an accessible cross-platform form and review/confirm st`
- `16: | **P1** | Financial confirmation is client-formatted and lacks server reference | The success message repeats user input amount and does not present a returned transaction reference or a refreshable ledger state. | Return stable transfer I`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: | **P0** | Saved-card screen adds hard-coded, non-tokenized cards | Tapping “add card” submits fixed Visa/Mada numbers, holder `Ahmed`, and expiries. Backend keeps only last four digits, but has no payment-gateway token/reference or verific`
- `12: | **P0** | Wallet transfer is not an all-or-nothing ledger operation | Backend debits sender, then credits recipient, then creates two transaction rows without a database transaction, compensating action, or outbox. A failure after debit ca`
- `15: | **P1** | “Family” / “doctor” transfer types are UI-only | Both choices transmit the same unrestricted recipient text. Backend resolves any user by ID/phone/email and does not assert an active family relationship or provider role. | Either`
- `16: | **P1** | Financial confirmation is client-formatted and lacks server reference | The success message repeats user input amount and does not present a returned transaction reference or a refreshable ledger state. | Return stable transfer I`
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `13: | **P0** | Transfer retries can duplicate a financial operation | Client has no submit lock/idempotency key and Backend has no idempotency/replay contract. Network failure after a committed transfer can lead a patient to resubmit. | Require`
- `14: | **P1** | Transfer input is unsupported on Android | Screen uses `Alert.prompt` twice; React Native supports it only on iOS, so transfer cannot be completed on Android. | Replace with an accessible cross-platform form and review/confirm st`
- `16: | **P1** | Financial confirmation is client-formatted and lacks server reference | The success message repeats user input amount and does not present a returned transaction reference or a refreshable ledger state. | Return stable transfer I`
- `17: | **P1** | Wallet copy remains hard-coded Arabic | Transfer, cards, validation, and success/error copy are not six-locale coverage. | Move to keyed AR/EN/UR/HI/BN/FIL copy and test RTL/LTR form behavior. |`
### payment_insurance_relevance
- `1: # Phase 2 Patient — wallet transfer and saved-card contract gaps`
- `5: Wallet balance/transactions are authenticated and transfer uses an atomic conditional debit, protecting against a simple concurrent insufficient-balance double spend. The service validates recipient existence and rejects self-transfer. Top-`
- `11: | **P0** | Saved-card screen adds hard-coded, non-tokenized cards | Tapping “add card” submits fixed Visa/Mada numbers, holder `Ahmed`, and expiries. Backend keeps only last four digits, but has no payment-gateway token/reference or verific`
- `12: | **P0** | Wallet transfer is not an all-or-nothing ledger operation | Backend debits sender, then credits recipient, then creates two transaction rows without a database transaction, compensating action, or outbox. A failure after debit ca`
- `15: | **P1** | “Family” / “doctor” transfer types are UI-only | Both choices transmit the same unrestricted recipient text. Backend resolves any user by ID/phone/email and does not assert an active family relationship or provider role. | Either`
- `17: | **P1** | Wallet copy remains hard-coded Arabic | Transfer, cards, validation, and success/error copy are not six-locale coverage. | Move to keyed AR/EN/UR/HI/BN/FIL copy and test RTL/LTR form behavior. |`
- `21: Wallet top-up remains correctly deferred behind live payment activation, but P2P transfer and card management are **FIX/BLOCKED** for financial integrity, cross-platform functionality, and user-data truthfulness.`
### error_empty_loading_retry_cancel
- `17: | **P1** | Wallet copy remains hard-coded Arabic | Transfer, cards, validation, and success/error copy are not six-locale coverage. | Move to keyed AR/EN/UR/HI/BN/FIL copy and test RTL/LTR form behavior. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
