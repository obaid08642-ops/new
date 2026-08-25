# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_F_FAMILY_OWNERSHIP_CONTRACTS_20260819.md`
- **Member SHA-256:** `86552f45e6800782f45ea021d65ff7d5a8a1103e19c6a8d6fcc64b2fc007346e`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The source audit confirmed two P0 ownership defects: Family Chat used the legacy `familymembers` collection to infer membership, and one Health Family Hub passed `memberId` while target family screens and the canonical API expected `id`/use`
- `14: | Patient Health Family Hub | Member health and permissions navigation now pass `id`, `name`, and `relation`, matching the target screen’s `useLocalSearchParams`, the canonical `members[].user_id`, and `/family/member/:userId/*` API contrac`
- `27: | Branch upload | **PASS** — source commit `1171a9e` (`fix: enforce canonical family membership`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch F: family ownership contracts`
- `5: The source audit confirmed two P0 ownership defects: Family Chat used the legacy `familymembers` collection to infer membership, and one Health Family Hub passed `memberId` while target family screens and the canonical API expected `id`/use`
- `11: | Family Chat authorization | `FamilyChatController` now requires `JwtAuthGuard` explicitly and resolves membership exclusively from active `family_groups`: owner ID or `members.user_id`, with `is_deleted != true`. No active group returns ``
- `12: | Conversation key | Reads and writes use canonical `FamilyGroup.id` as `family_id`; the `familymembers` collection is no longer an authorization source. |`
- `14: | Patient Health Family Hub | Member health and permissions navigation now pass `id`, `name`, and `relation`, matching the target screen’s `useLocalSearchParams`, the canonical `members[].user_id`, and `/family/member/:userId/*` API contrac`
- `31: Phase 11 must verify on an approved sandbox deployment that patient2 and a removed family member receive a safe refusal for patient1’s family chat/messages/permissions/member records, while the canonical owner/member can access only the cor`
### state_transitions
- `5: The source audit confirmed two P0 ownership defects: Family Chat used the legacy `familymembers` collection to infer membership, and one Health Family Hub passed `memberId` while target family screens and the canonical API expected `id`/use`
- `31: Phase 11 must verify on an approved sandbox deployment that patient2 and a removed family member receive a safe refusal for patient1’s family chat/messages/permissions/member records, while the canonical owner/member can access only the cor`
### payment_insurance_relevance
- `21: | Combined Backend Phase 8 regressions | **PASS** — 5 suites, 34 tests across public discovery, Realtime, payments, JWT and family membership. |`
### error_empty_loading_retry_cancel
- `5: The source audit confirmed two P0 ownership defects: Family Chat used the legacy `familymembers` collection to infer membership, and one Health Family Hub passed `memberId` while target family screens and the canonical API expected `id`/use`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
