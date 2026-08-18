# Phase 2 Patient — wallet transfer and saved-card contract gaps

## Confirmed controls

Wallet balance/transactions are authenticated and transfer uses an atomic conditional debit, protecting against a simple concurrent insufficient-balance double spend. The service validates recipient existence and rejects self-transfer. Top-up correctly creates a payment intent rather than directly crediting the balance.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Saved-card screen adds hard-coded, non-tokenized cards | Tapping “add card” submits fixed Visa/Mada numbers, holder `Ahmed`, and expiries. Backend keeps only last four digits, but has no payment-gateway token/reference or verification; it saves an arbitrary presentation record that cannot authorize a payment. | Remove the fake add-card flow; add cards only through a live gateway tokenization/hosted-field process after payment activation, storing gateway token + masked metadata only. |
| **P0** | Wallet transfer is not an all-or-nothing ledger operation | Backend debits sender, then credits recipient, then creates two transaction rows without a database transaction, compensating action, or outbox. A failure after debit can lose funds or yield an incomplete ledger. | Execute debit, credit, and paired immutable ledger entries in one MongoDB transaction/session, or block P2P transfer until transactional infrastructure is verified; reconcile and alert on failures. |
| **P0** | Transfer retries can duplicate a financial operation | Client has no submit lock/idempotency key and Backend has no idempotency/replay contract. Network failure after a committed transfer can lead a patient to resubmit. | Require a client-generated idempotency key, persist replay outcome keyed by sender, and render server transaction/reference status before enabling another submit. |
| **P1** | Transfer input is unsupported on Android | Screen uses `Alert.prompt` twice; React Native supports it only on iOS, so transfer cannot be completed on Android. | Replace with an accessible cross-platform form and review/confirm step; disable while in flight and show result using server reference/balance. |
| **P1** | “Family” / “doctor” transfer types are UI-only | Both choices transmit the same unrestricted recipient text. Backend resolves any user by ID/phone/email and does not assert an active family relationship or provider role. | Either label it as a generic wallet transfer or enforce the selected relationship/role in a server-issued recipient selector/transfer purpose contract. |
| **P1** | Financial confirmation is client-formatted and lacks server reference | The success message repeats user input amount and does not present a returned transaction reference or a refreshable ledger state. | Return stable transfer ID, amount, counterparty-safe label, and state; show a confirmation/detail route backed by ledger data. |
| **P1** | Wallet copy remains hard-coded Arabic | Transfer, cards, validation, and success/error copy are not six-locale coverage. | Move to keyed AR/EN/UR/HI/BN/FIL copy and test RTL/LTR form behavior. |

## Decision

Wallet top-up remains correctly deferred behind live payment activation, but P2P transfer and card management are **FIX/BLOCKED** for financial integrity, cross-platform functionality, and user-data truthfulness.
