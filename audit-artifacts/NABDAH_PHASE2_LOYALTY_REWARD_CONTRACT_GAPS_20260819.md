# Phase 2 Patient — loyalty and reward-claim contract gaps

## Confirmed controls

All loyalty endpoints are protected by JWT, account and transaction reads use the requesting user, and the client waits for a claim request before displaying its local success message. These access controls are **PASS**.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Reward claim is not atomic | Backend reads account balance, then separately decrements points, creates a transaction, decrements stock, and creates claim. Concurrent claims can overspend points, oversell stock, or leave points/stock/ledger/claim inconsistent after an intermediate failure. | Use a database transaction/session or a single conditional state machine that atomically reserves stock, debits points, creates immutable ledger entry, and creates claim; add concurrent-claim and fault-injection tests. |
| **P1** | Claims are not idempotent | Client does not send an idempotency key and Backend stores no replay key. A timeout after commit permits repeated deduction/claim on retry. | Persist a per-user idempotency key and return the original claim outcome on replay; bind UI submission locking to the stable claim reference. |
| **P1** | Coupon code generation is predictable and ungoverned | Coupon reward code uses `Math.random`, without cryptographic generation, hashed-at-rest verification, expiry, redemption ownership check, or secure delivery contract. | Generate CSPRNG codes/tokens, store/verifiy securely with expiry/redemption state, and expose only an owned claimed-reward view. |
| **P1** | Monetary point equivalence is hard-coded in the client | Loyalty hub states `points / 100` equals a SAR discount although account/config APIs return no point-to-currency conversion or approved terms. | Remove the monetary claim until server returns an approved locale/currency-aware redemption rule and terms; calculate only from server data. |
| **P1** | Fallback tiers/earn methods can misstate benefits | UI retains static tier/earning defaults whenever config cannot load, despite these being programme terms. | Fail visibly and retain no unverified benefits/rates; make current programme rules/version server-authoritative. |
| **P1** | Loyalty copy and reward metadata are Arabic/raw | The visible currency/equivalence, tiers, claims, errors, and reward titles are not six-language complete. | Use reviewed locale keys and server-provided localized content/terms; test RTL/LTR including numbers and currency. |

## Decision

Loyalty account reads are **PASS**, but reward redemption and programme-value presentation are **FIX/BLOCKED** until financial integrity, idempotency, secure coupon handling, authoritative terms, and localization are implemented.
