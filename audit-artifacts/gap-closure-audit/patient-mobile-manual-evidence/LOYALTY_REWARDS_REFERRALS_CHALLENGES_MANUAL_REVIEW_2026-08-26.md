# Patient Mobile: Loyalty rewards, referrals and challenges — manual review

## Scope boundary

This read-only source review covers all five Loyalty inventory routes. It does not establish points-ledger integrity, tier/reward eligibility, redemption atomicity, coupon issuance/validity, referral fraud prevention, identity/privacy policy, tax/accounting treatment, reward terms, or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/loyalty/hub.tsx` | Account, config, transactions, reward claim and cash-equivalence UI |
| `app/loyalty/rewards.tsx` | Rewards catalog and claim flow |
| `app/loyalty/referrals.tsx` | Referral code, sharing, application and invite status |
| `app/loyalty/challenges.tsx` | Challenge discovery/join/progress display |
| `app/loyalty/leaderboard.tsx` | Leaderboard display and client masking |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-LOY-001 | `CONFIRMED_DEFECT` | `loyalty/hub.tsx:20–31, 134–140, 265–323`; `loyalty/rewards.tsx:43–79` | Hub provides local default tiers/earn ways and globally displays `points / 100` as Riyal discount. Rewards screen deducts points optimistically after any successful claim and fabricates `NAB-FREE` when response has no coupon. These are client-authored financial/reward claims not tied to an authoritative issued-reward/ledger result. | Immutable points ledger, reward terms/config/version, server-authoritative discount/coupon/claim response, atomic idempotent redemption and balance reconciliation tests. |
| PM-LOY-002 | `STATIC_MATCHED_PARTIAL` | `loyalty/referrals.tsx:49–97, 139–224, 256–280` | Referral code/load/apply has server calls and error states, but share copy hard-codes 50/100 points and a download URL; client displays invite identity/name/status and reward progress. Static review cannot prove eligibility, self-referral/device/abuse controls, first-booking definition, privacy consent or issuance reconciliation. | Referral state machine/anti-fraud/eligibility/ledger contracts, PII minimization/consent, terms/version and owner/stranger/replay tests. |
| PM-LOY-003 | `STATIC_MATCHED_PARTIAL` | `loyalty/challenges.tsx:27–58, 79–158` | Challenge screen receives list/progress but creates local joined state after POST and derives all counts/points/progress/end defaults client-side. Static review cannot prove completion evidence, points awarding, expiry/timezone, join capacity/idempotency or health-activity privacy/safety. | Challenge participation/progress/award state machine, activity source/consent, server clock/expiry and idempotency/ledger tests. |
| PM-LOY-004 | `CONFIRMED_DEFECT` | `loyalty/leaderboard.tsx:34–50, 162–205` | Leaderboard synthesizes display names from truncated user IDs and always sets rank change to 0 and `isMe` false. This makes movement and self-position untruthful while exposing a client-derived identifier fragment. | Privacy-reviewed leaderboard projection with server-provided pseudonyms/consent, self-rank/movement semantics, opt-out and authorization tests. |

## Conclusion

The Loyalty routes contain real endpoint calls, but client defaults, cash-equivalence conversion, fabricated coupon fallback, static referral rewards and derived leaderboard presentation prevent production claims. Manual source review is complete only for these five inventory paths.
