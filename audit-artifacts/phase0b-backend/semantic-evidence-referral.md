# Phase 0B semantic evidence — Referral

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/referral/referral.service.ts:2–149`
- `src/modules/referral/referral.controller.ts:2–26`
- `src/modules/referral/referral.module.ts:1–10`
- `src/schemas/referral.schema.ts:1–48`

`referral.service.ts:35–56` generates a human-friendly code using `Math.random`, checks collisions in users, and writes with a conditional update; fallback UUID is not stored in the same atomic operation. `:58–87` returns dashboard invites and resolves referred users' full_name values into names, with no explicit pagination cursor or privacy mask beyond a generic fallback. `:90–129` validates code/self-use/account age/prior completed appointments, checks an existing invite, inserts a referral invite and separately updates the user attribution; no unique database constraint or transaction is visible for the one-referral invariant. `:132–148` atomically claims a registered invite on booking completion, then emits two reward events outside a durable outbox; event listeners are assumed to award the stated loyalty points.

`referral.controller.ts:10–25` uses JwtAuthGuard and NoGuestsGuard, exposes dashboard and apply, but body is inline-typed and no visible idempotency key/replay contract exists. `referral.module.ts` wires only controller/service. `referral.schema.ts:7–48` defines ReferralCode/ReferralReward collections with unique code and unique referrer/referee reward pair, but the service actually uses `users.referral_code` and `referral_invites`, creating a persistence-model drift; amounts/useCount and lifecycle are lightly bounded.

## Findings candidates

The read supports: service/schema collection drift, referral apply race and split-brain attribution, weak code entropy/uniqueness handling, dashboard PII exposure, event/reward durability gap, and missing idempotency/amount/expiry/abuse constraints.

No product code was changed and no tests/builds were executed during this semantic read.
