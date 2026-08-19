# Phase 8 — Batch F: family ownership contracts

## Purpose

The source audit confirmed two P0 ownership defects: Family Chat used the legacy `familymembers` collection to infer membership, and one Health Family Hub passed `memberId` while target family screens and the canonical API expected `id`/user ID. A removed or unrelated user could therefore risk access to a wrong family chat grouping, while valid health-hub navigation could resolve to an empty/wrong target.

## Source change

| Surface | Implemented control |
|---|---|
| Family Chat authorization | `FamilyChatController` now requires `JwtAuthGuard` explicitly and resolves membership exclusively from active `family_groups`: owner ID or `members.user_id`, with `is_deleted != true`. No active group returns `not_active_family_member` before any message query/write. |
| Conversation key | Reads and writes use canonical `FamilyGroup.id` as `family_id`; the `familymembers` collection is no longer an authorization source. |
| Removal protection | Since the canonical membership query runs for every read/send, an entry removed from `family_groups.members` cannot continue access based on a stale legacy record. |
| Patient Health Family Hub | Member health and permissions navigation now pass `id`, `name`, and `relation`, matching the target screen’s `useLocalSearchParams`, the canonical `members[].user_id`, and `/family/member/:userId/*` API contract. |

## Verification

| Gate | Result |
|---|---|
| Focused Family Chat regression | **PASS** — `compat-family-chat.spec.ts`: 1 suite, 2 tests. It rejects no-active-group before message query and confirms a member’s read/write use canonical group ID. |
| Combined Backend Phase 8 regressions | **PASS** — 5 suites, 34 tests across public discovery, Realtime, payments, JWT and family membership. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Archive integrity | **PASS** — both rebuilt archives validate with `unzip -tq`; dependencies and build artifacts are excluded. |
| Backend archive SHA-256 | `ed74b689593d30e6d49bde4e57cd6f18aaec8a46e39cb06f77c48fd9913e7bd9` |
| Patient archive SHA-256 | `2924129716dcb782a45101cf8d584fe9ec07596aaefa39685acb4b8b0ce28c9d` |
| Branch upload | **PASS** — source commit `1171a9e` (`fix: enforce canonical family membership`) is on `manus/on-live-reconciliation`. |

## Remaining acceptance

Phase 11 must verify on an approved sandbox deployment that patient2 and a removed family member receive a safe refusal for patient1’s family chat/messages/permissions/member records, while the canonical owner/member can access only the correct group. It must also confirm no old `familymembers` record can restore access. No non-sandbox family data was queried or changed in this batch.
