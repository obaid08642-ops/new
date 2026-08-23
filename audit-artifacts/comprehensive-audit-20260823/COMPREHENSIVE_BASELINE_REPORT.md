# Comprehensive Mobile ↔ Web Baseline Audit

> This is a conservative source inventory. A filename or route candidate is not functional parity evidence. Each action still requires live contract, server boundary, ownership, error, and end-to-end journey proof.

## Executive counts

| Metric | Count |
|---|---:|
| Mobile source screen/route files | 250 |
| Mobile files with action markers | 200 |
| Mobile files with non-GET mutation markers | 88 |
| Web page routes | 56 |
| Mobile files with name-based Web candidate | 28 |
| Mobile files without name-based Web candidate | 222 |
| Atomic journeys in register | 72 |
| Journeys requiring contract/status recheck | 39 |
| Journeys blocked/deferred | 33 |

## Domain breakdown

| Domain | Mobile files | Actions | Mutations | Web name candidates | Missing Web candidates | Journeys | Blocked/deferred journeys |
|---|---:|---:|---:|---:|---:|---:|---:|
| `(auth)` | 10 | 9 | 6 | 1 | 9 | 9 | 0 |
| `(onboarding)` | 4 | 3 | 0 | 0 | 4 | 3 | 0 |
| `(tabs)` | 8 | 7 | 0 | 3 | 5 | 4 | 1 |
| `_layout.tsx` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |
| `ai` | 7 | 4 | 3 | 0 | 7 | 0 | 0 |
| `ai-assistant.tsx` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `articles` | 3 | 3 | 1 | 1 | 2 | 2 | 0 |
| `community` | 2 | 2 | 2 | 0 | 2 | 1 | 0 |
| `consultations` | 28 | 25 | 7 | 1 | 27 | 8 | 8 |
| `delivery` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `diagnostics` | 20 | 15 | 3 | 4 | 16 | 0 | 0 |
| `drug-scanner` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |
| `emergency` | 4 | 3 | 2 | 1 | 3 | 0 | 0 |
| `family` | 12 | 10 | 6 | 2 | 10 | 7 | 7 |
| `health` | 26 | 20 | 10 | 7 | 19 | 10 | 0 |
| `index.tsx` | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| `insurance` | 13 | 12 | 5 | 0 | 13 | 2 | 2 |
| `loyalty` | 5 | 5 | 4 | 0 | 5 | 0 | 0 |
| `map` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `maternity` | 7 | 2 | 1 | 0 | 7 | 0 | 0 |
| `mental-health` | 8 | 3 | 2 | 2 | 6 | 4 | 0 |
| `notifications` | 1 | 1 | 1 | 0 | 1 | 1 | 0 |
| `nursing` | 4 | 4 | 1 | 0 | 4 | 0 | 0 |
| `nutrition` | 13 | 4 | 3 | 0 | 13 | 2 | 2 |
| `offers` | 2 | 2 | 0 | 0 | 2 | 0 | 0 |
| `orders` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `payments` | 4 | 4 | 1 | 0 | 4 | 0 | 0 |
| `pharmacy` | 22 | 21 | 12 | 3 | 19 | 11 | 11 |
| `profile` | 4 | 3 | 2 | 1 | 3 | 0 | 0 |
| `programs` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |
| `reports` | 5 | 4 | 0 | 0 | 5 | 1 | 0 |
| `returns` | 3 | 3 | 1 | 0 | 3 | 0 | 0 |
| `reviews` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |
| `room` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `s` | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| `search` | 1 | 1 | 0 | 0 | 1 | 1 | 0 |
| `services` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `settings` | 12 | 10 | 4 | 1 | 11 | 3 | 0 |
| `shared` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |
| `support` | 2 | 2 | 1 | 1 | 1 | 1 | 0 |
| `voice` | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| `wallet` | 5 | 5 | 4 | 0 | 5 | 2 | 2 |
| `wearables` | 1 | 1 | 1 | 0 | 1 | 0 | 0 |

## File-level gap rules

| Status | Meaning |
|---|---|
| `MISSING_WEB_SURFACE` | No same-name Web page candidate; requires a capability-level mapping, not automatic route creation. |
| `PARTIAL_MUTATION_CONTRACT_REQUIRED` | Mobile has a non-GET marker; Web candidate does not prove payload, idempotency, ownership, or cleanup. |
| `PARTIAL_ACTION_PROOF_REQUIRED` | Mobile has actions, but no mutation method marker was found; Web still needs scenario and contract proof. |
| `READ_CANDIDATE_CONTRACT_PROOF_REQUIRED` | A same-name Web candidate exists, but live contract and SSR/security evidence are still required. |

## Evidence files

- `mobile_web_screen_gap_matrix.tsv`: one row per Mobile source screen/route file.
- `journey_72_gap_matrix.tsv`: one row per atomic journey from the 72-journey register.
- `mobile_navigation_actions.tsv`: raw navigation/action markers.
- `mobile_api_calls.tsv`: raw API markers.
- `web_routes.txt`: Web route inventory.
- `web_api_usage.tsv`: Web API usage inventory.

## Production gate

**NO-GO for 100% parity** until every row is capability-mapped and every patient journey has live contract, owner/stranger/unauth, failure/retry, cleanup, and browser/mobile responsive evidence.
