# Phase 0B semantic evidence — wallet.schema.ts

**Archive member:** `src/schemas/wallet.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–55; full 55-line member covered.

Lines 2–5 import Mongoose Document/uuid and define WalletDocument. Lines 7–26 define timestamped `wallets` collection. Wallet has generated unique string id (9–10), required indexed ownerId and ownerType limited to patient/provider (12–16), required balance default 0 (18–19), and savedCards array with id/type/last4/holderName/expiry/isDefault/gradient fields (21–22). Line 26 adds a unique compound ownerId/ownerType index.

Lines 28–55 define timestamped `wallet_transactions` collection. Each transaction has generated unique id (32–33), walletId (35–36), amount (38–39), type limited to credit/debit (41–42), referenceType limited to booking/refund/referral/commission/insurance_escrow (44–45), referenceId (47–48), and description (50–51). Line 55 indexes walletId/createdAt descending.

**Audit judgment:** The one-wallet-per-owner/type unique index is a positive integrity control. However balance and transaction amount have no currency, integer precision, finite/nonnegative bounds or immutable-ledger constraints; no unique `(walletId, referenceType, referenceId, type)` or idempotency key prevents duplicate financial entries; no transaction/sequence/version/debit-available invariant is represented; savedCards stores holderName and expiry beyond last4 with no token/provider reference, encryption/redaction or PCI boundary evidence; and walletId has no schema reference/owner binding. A debit/credit service must enforce these controls atomically; this schema alone does not.

No product code was changed and no tests were executed during this semantic read.
