# Phase 4 Admin Dashboard — user management gaps

## Confirmed positive behavior

The directory distinguishes ordinary provider review state from active status and protects ordinary UI actions for accounts labeled admin/super_admin. It also loads separate user/provider file routes rather than embedding seeded user records.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Permanent user deletion is exposed with only two browser confirmation dialogs | `DELETE /admin/users/:id` is enabled for every non-admin row and claims to delete the user and owned database records permanently. There is no verified privacy-rights case, retention/hold/dependency preview, step-up, maker-checker or audit receipt in the UI. | Disable destructive deletion for release; preserve fail-closed privacy/right-to-erasure workflow pending legal approval, verified request/case, retention exceptions, impact preview, approved actors, audit, cancellation and confirmation. |
| **P0** | Suspend/reactivate actions have no required reason, policy, scope, step-up or post-action evidence | A generic browser confirm triggers ban/unban; no incident/case link, reason code, end date, access/session revocation, notification, appeal or returned enforcement record is presented. | Use controlled, audited suspension state machine with reason/policy, scope, expiration/review, session revocation, notice/appeal and high-risk approval requirements. |
| **P1** | Full user profile view reveals broad PHI/relationship/activity data without visible minimum-necessary scope | Overview can expose phone/email/city/devices/SOS count, family members, appointments, service requests, provider registration/contract documents and financial activity in one page. | Enforce server-side role/purpose/branch scope; minimize/mask fields by task, require just-in-time reason for sensitive views, show access/watermark/audit status and forbid unapproved health/consent access. |
| **P1** | Status filter misclassifies rejected providers as pending | `statusFilter === 'pending'` includes both `pending` and `rejected`, impairing review queues and operational truthfulness. | Use distinct typed status facets and exhaustive server enum mapping. |
| **P1** | Directory truncates discovery at 200 records without pagination/cursor context | The list requests `limit=200` and treats returned count as total/visible state; administrators cannot know whether results are complete. | Add server-driven pagination/cursors, total/filtered counts, query scope and robust empty/error/stale state. |
| **P1** | Provider approve/reject/suspend repeats prompt-based unstructured governance | Rejection/suspension accepts any prompt text (including empty string) and approval is a browser confirm, duplicating moderation-control weaknesses. | Reuse the typed KYC/moderation decision workflow with risk classification, reason codes, reviewer evidence and maker-checker requirements. |
| **P1** | User-management UI is Arabic-only with emoji/text controls and incomplete accessible high-risk warnings | Role/status/action and personal-data views lack six-language/RTL-LTR/accessibility coverage. | Implement reviewed multilingual accessible high-risk UI with vector controls and purpose/consent labels. |

## Decision

User management is **P0 FIX/BLOCKED**. It must not offer permanent deletion or broad staff access to user/PHI records until legally governed, least-privilege, auditable workflows are implemented.
