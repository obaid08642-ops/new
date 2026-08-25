# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_USER_MANAGEMENT_GAPS_20260819.md`
- **Member SHA-256:** `ca9d188449a60ed78eae6b93e89b038c697244e9f4d6f66a71ebc3dfab4dd1a9`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The directory distinguishes ordinary provider review state from active status and protects ordinary UI actions for accounts labeled admin/super_admin. It also loads separate user/provider file routes rather than embedding seeded user record`
- `11: | **P0** | Permanent user deletion is exposed with only two browser confirmation dialogs | `DELETE /admin/users/:id` is enabled for every non-admin row and claims to delete the user and owned database records permanently. There is no verifi`
- `13: | **P1** | Full user profile view reveals broad PHI/relationship/activity data without visible minimum-necessary scope | Overview can expose phone/email/city/devices/SOS count, family members, appointments, service requests, provider regist`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — user management gaps`
- `5: The directory distinguishes ordinary provider review state from active status and protects ordinary UI actions for accounts labeled admin/super_admin. It also loads separate user/provider file routes rather than embedding seeded user record`
- `11: | **P0** | Permanent user deletion is exposed with only two browser confirmation dialogs | `DELETE /admin/users/:id` is enabled for every non-admin row and claims to delete the user and owned database records permanently. There is no verifi`
- `12: | **P0** | Suspend/reactivate actions have no required reason, policy, scope, step-up or post-action evidence | A generic browser confirm triggers ban/unban; no incident/case link, reason code, end date, access/session revocation, notificat`
- `13: | **P1** | Full user profile view reveals broad PHI/relationship/activity data without visible minimum-necessary scope | Overview can expose phone/email/city/devices/SOS count, family members, appointments, service requests, provider regist`
- `15: | **P1** | Directory truncates discovery at 200 records without pagination/cursor context | The list requests `limit=200` and treats returned count as total/visible state; administrators cannot know whether results are complete. | Add serve`
- `17: | **P1** | User-management UI is Arabic-only with emoji/text controls and incomplete accessible high-risk warnings | Role/status/action and personal-data views lack six-language/RTL-LTR/accessibility coverage. | Implement reviewed multiling`
### state_transitions
- `3: ## Confirmed positive behavior`
- `5: The directory distinguishes ordinary provider review state from active status and protects ordinary UI actions for accounts labeled admin/super_admin. It also loads separate user/provider file routes rather than embedding seeded user record`
- `7: ## Confirmed defects`
- `11: | **P0** | Permanent user deletion is exposed with only two browser confirmation dialogs | `DELETE /admin/users/:id` is enabled for every non-admin row and claims to delete the user and owned database records permanently. There is no verifi`
- `12: | **P0** | Suspend/reactivate actions have no required reason, policy, scope, step-up or post-action evidence | A generic browser confirm triggers ban/unban; no incident/case link, reason code, end date, access/session revocation, notificat`
- `13: | **P1** | Full user profile view reveals broad PHI/relationship/activity data without visible minimum-necessary scope | Overview can expose phone/email/city/devices/SOS count, family members, appointments, service requests, provider regist`
- `14: | **P1** | Status filter misclassifies rejected providers as pending | `statusFilter === 'pending'` includes both `pending` and `rejected`, impairing review queues and operational truthfulness. | Use distinct typed status facets and exhaust`
- `15: | **P1** | Directory truncates discovery at 200 records without pagination/cursor context | The list requests `limit=200` and treats returned count as total/visible state; administrators cannot know whether results are complete. | Add serve`
- `16: | **P1** | Provider approve/reject/suspend repeats prompt-based unstructured governance | Rejection/suspension accepts any prompt text (including empty string) and approval is a browser confirm, duplicating moderation-control weaknesses. | `
- `17: | **P1** | User-management UI is Arabic-only with emoji/text controls and incomplete accessible high-risk warnings | Role/status/action and personal-data views lack six-language/RTL-LTR/accessibility coverage. | Implement reviewed multiling`
### payment_insurance_relevance
- `15: | **P1** | Directory truncates discovery at 200 records without pagination/cursor context | The list requests `limit=200` and treats returned count as total/visible state; administrators cannot know whether results are complete. | Add serve`
- `17: | **P1** | User-management UI is Arabic-only with emoji/text controls and incomplete accessible high-risk warnings | Role/status/action and personal-data views lack six-language/RTL-LTR/accessibility coverage. | Implement reviewed multiling`
- `21: User management is **P0 FIX/BLOCKED**. It must not offer permanent deletion or broad staff access to user/PHI records until legally governed, least-privilege, auditable workflows are implemented.`
### error_empty_loading_retry_cancel
- `11: | **P0** | Permanent user deletion is exposed with only two browser confirmation dialogs | `DELETE /admin/users/:id` is enabled for every non-admin row and claims to delete the user and owned database records permanently. There is no verifi`
- `14: | **P1** | Status filter misclassifies rejected providers as pending | `statusFilter === 'pending'` includes both `pending` and `rejected`, impairing review queues and operational truthfulness. | Use distinct typed status facets and exhaust`
- `15: | **P1** | Directory truncates discovery at 200 records without pagination/cursor context | The list requests `limit=200` and treats returned count as total/visible state; administrators cannot know whether results are complete. | Add serve`
- `16: | **P1** | Provider approve/reject/suspend repeats prompt-based unstructured governance | Rejection/suspension accepts any prompt text (including empty string) and approval is a browser confirm, duplicating moderation-control weaknesses. | `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
