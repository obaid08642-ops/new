# Phase 0B semantic evidence — Loyalty

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/loyalty/loyalty.service.ts:2–338`
- `src/modules/loyalty/loyalty.controller.ts:2–68`
- `src/modules/loyalty/loyalty.module.ts:2–35`
- `src/schemas/loyalty.schemas.ts:2–87`
- all six files under `src/modules/loyalty/repositories/*.repository.ts:1–13`

`loyalty.service.ts:16–68` defines tier/points display constants and derives earn ways from the points table, although tier perks include cashback/free consultations that are not implemented in this member. `:76–125` attempts duplicate protection by querying `(user, reason, ref)` before separately creating/updating the account and transaction; account creation, balance update, transaction insert and challenge progress are not atomic. `:132–157` sweeps expired points by reading stale transactions, marking them swept, then separately decrementing balance and adding an expiry transaction. Event listeners `:161–198` award points from booking/order/review/referral/vitals events, with vitals capped through a non-atomic count and no ref ID.

`:202–257` updates challenge progress using read/create/read/update steps and awards completion points from the event path; duplicate/concurrent events can overshoot or duplicate completion rewards. `:262–289` creates accounts on read, returns transactions/leaderboard with direct user IDs, and has weak limit validation. `:293–338` lists reward catalog and claims a reward by checking points, decrementing balance, inserting transaction, decrementing stock and creating claim separately; concurrent claims can overspend points/overdraw stock and coupon generation uses `Math.random`.

`loyalty.controller.ts:8–68` applies JWT but uses literal `'guest'` for account/transactions/challenges/claim/claimed routes; leaderboard and config are broadly readable to any authenticated caller, and claim/join mutations have no visible Idempotency-Key or rate limit. `loyalty.module.ts:20–35` registers six schemas/repositories. `loyalty.schemas.ts:4–87` defines six collections, but points/amounts/counts/statuses are mostly unbounded/free strings; ChallengeProgress lacks a unique compound index, and RewardClaim lacks a unique `(user_id,reward_id)` or request key. Repositories are thin wrappers with no hidden atomicity/ownership logic.

## Findings candidates

The read supports: non-atomic earn/expiry/claim ledgers, shared guest identity, challenge progress/reward races, stock/points overspend, leaderboard identity exposure, unimplemented advertised perks, weak bounds/statuses/coupon entropy and missing idempotency/audit/retention.

No product code was changed and no tests/builds were executed during this semantic read.
