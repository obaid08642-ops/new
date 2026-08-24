# Phase 0B semantic evidence — WalletService

**Archive member:** `src/modules/wallet/wallet.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 1–327 and 328–353 from the baseline archive extraction.

Lines 1–20 define dependencies on wallet/transaction/user repositories, Mongo connection, and Moyasar. Lines 22–30 read commission and debt-suspension configuration from `finance_config`, with defaults of 15% and SAR 500 when configuration is absent. Lines 32–47 create/find wallets and return their balances; missing wallets are created with balance zero.

Lines 49–59 return paginated transaction lists. Page/limit are arithmetic inputs without visible bounds validation in this service. Lines 61–82 define an internal `topup` credit path documented as not client-exposed; it directly increments wallet balance and records a transaction, with only positive-amount validation.

Lines 84–137 implement gateway-backed wallet top-up intent. Amount is rounded to two decimals, finite/positive, and capped at 50,000. A prior pending intent for the same user/amount may be reused after Moyasar status sync. Otherwise a unique `wt_` ID is created, a real Moyasar payment is requested with `skipBookingValidation:true`, and a pending record is inserted into `wallet_topups`. The owner type is persisted; payment URL/Moyasar ID are stored.

Lines 139–176 implement top-up confirmation. The top-up is looked up by ID, ownership mismatch returns `ForbiddenException`, already-credited returns current balance, and Moyasar status is synchronized. Non-paid status updates the record and returns pending/failed status without credit. A conditional `findOneAndUpdate` claims `pending_payment → credited`; concurrent/replay callers observe already-credited and do not re-credit. After claim, internal `topup` increments the wallet and records a transaction. Wallet credit and top-up status transition are not visibly wrapped in one database transaction.

Lines 178–183 implement owner-scoped top-up read, returning `ForbiddenException` for a foreign ID rather than a 404. Lines 185–247 implement transfer. It validates positive amount and balance, resolves recipient by id/phone/email, rejects self-transfer, atomically debits sender under a balance guard, atomically increments recipient, and writes debit/credit transaction records using a shared reference ID. The two wallet updates and two transaction inserts are not visibly one Mongo transaction; failure after debit could create ledger inconsistency.

Lines 250–275 implement provider commission debt. It computes commission from configuration, allows negative provider balance as debt, records a debit, and deactivates the provider when debt crosses threshold. Lines 278–290 record insurance escrow as a pending credit transaction without adding to available balance; settlement behavior is delegated elsewhere.

Lines 293–326 implement saved cards. Reads create missing wallets and return saved cards. Adds validate last4, holder name, and MM/YY shape, then persist a generated ID, type, holder/expiry, default status, and UI gradient. The method can derive last4 from a full cardNumber if supplied; no tokenization/provider vault call is visible. Removal filters by card ID, restores a default card when needed, and persists.

Lines 328–353 aggregate debit transactions for the last 90 days by reference type, map categories/colors through a fixed metadata map, round amounts, and sort descending. This is a presentation aggregation over real transaction rows; unknown reference types are labeled `أخرى`.

**Auth/ownership:** owner ID/type are passed by controller; top-up reads explicitly reject foreign owners with 403; transfer recipient lookup is broad by id/phone/email; provider/patient type is derived upstream.

**State transitions:** wallet creation; pending topup → credited/failed; atomic debit/increment transfer; commission debt and provider suspension; insurance escrow pending; card add/remove/default repair.

**Price/payment/insurance source:** top-up amount is user-chosen but gateway-backed; Moyasar is the payment source; insurance escrow is ledger-only pending settlement; commission uses finance configuration. Wallet credit is after gateway `paid` status.

**Security/truthfulness observations:** top-up confirmation is claim-protected but credit/status are not visibly one transaction; transfer is only partially atomic across wallets/ledger; top-up foreign IDs return 403 rather than non-disclosing 404; saved-card data may accept raw card number and stores expiry/holder fields with no visible tokenization; missing wallets and zero balance are real initialized states, not fabricated balance.

**Test implications:** gateway status/replay/concurrency; owner/stranger non-disclosure; transfer double-spend and partial failure; ledger consistency; commission threshold; insurance settlement; card tokenization/redaction; pagination bounds; and spending aggregation correctness. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
