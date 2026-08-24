# Semantic evidence — Mobile Wallet Topup

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/wallet/topup.tsx:32–40` reads wallet balance and validates a locally entered amount between 10 and 50,000 SAR. Balance failures are swallowed and leave zero with no retry/stale indicator. The numeric input strips non-numeric characters but permits malformed decimal forms; there is no server limits/fee/currency/fraud/velocity evidence in this screen.

`handleTopup` posts `POST /wallet/topup` with `{ amount }` and requires `topup_id` before routing to shared `/payments/processing` (`:41–69`). The source has no visible Idempotency-Key or payment-intent helper, so double taps/retry-after-timeout replay safety is not established. It does not assert that the returned amount equals the requested amount, that the topup belongs to the authenticated wallet, or that the topup is pending/unused. It passes `moyasar_id`, `payment_url`, `walletTopupId` and amount through route params; security and hosted-return/cancel handling depend on the shared processing screen and are not proven here.

The UI claims the wallet is credited only after gateway confirmation (`:2–4,204–206`), which is a sound desired invariant, but no client-visible confirmation, webhook reconciliation, duplicate credit prevention, timeout/authorized-but-uncredited recovery, refund/chargeback, or app-restart recovery is implemented in this screen. A generic alert handles intent errors and local submitting disables the button, but there is no domain-specific retry/resume state. No Phase 0 remediation was made.
