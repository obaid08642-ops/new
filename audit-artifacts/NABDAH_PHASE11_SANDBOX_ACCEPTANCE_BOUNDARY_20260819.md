# Phase 11 — sandbox acceptance boundary

## Authorized scope

Acceptance work may use only the supplied sandbox identities and the production API endpoint. It begins with read-only health/session/owned-record checks and negative authorization cases. Every request must be attributable to a sandbox identity, and identifiers/statuses must be recorded without exposing credentials or personal data in audit artifacts.

## Prohibited actions

The following remain out of scope unless the owner separately authorizes a bounded test: production deployment; payment capture/refund/Moyasar mutation; SOS dispatch; QR or consent activation; real user data access; catalog/governance mutation; financial withdrawal; and any destructive database or storage operation.

## Controlled sequence

| Stage | Allowed activity | Required outcome before progressing |
|---|---|---|
| 1 | Authentication and public/read-only endpoint checks with sandbox accounts. | Valid identity separation and no sensitive data leakage. |
| 2 | Negative authorization: patient2 against patient1-owned known sandbox resources, and role boundary checks. | `403`/`404` or equivalent fail-closed result. |
| 3 | Only reversible sandbox workflow actions already authorized in the execution plan. | Server confirmation, before/after state, cleanup/reversal evidence. |

## Existing blockers preserved

Moyasar, emergency/QR/consent/location, unapproved administrative operations and high-risk dependency migrations remain blocked. Passing a sandbox check is evidence for that exact contract only; it is never blanket production-release approval.
