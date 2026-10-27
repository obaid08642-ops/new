# Provider onboarding findings (QA V-07, test run 2026-10-27)

## V-07: an admin-rejected applicant can still sign in (P1 candidate, to confirm)

| Sev | Where | What happens | Expected |
|---|---|---|---|
| P1 (candidate) | `backend/src/modules/provider/services/provider-admin.service.ts:207-212` (admin reject: sets the account and profile to rejected, never sets the user inactive) | After the admin rejects an applicant (`POST /admin/admin/providers/:id/reject`), the account and profile read `rejected`, but `users.active` stays `true`. | A rejected applicant's user account is deactivated. |
| P1 (candidate) | `backend/src/modules/provider/provider.controllers.ts:32` (`provider/auth`, login) | The rejected applicant signs in with the right password and gets `201` with an access token. Nothing in the login refuses a rejected account. What that session can reach is not verified here. | A rejected applicant cannot sign in to the provider app. |

Two reject paths exist: `providers.service.ts` (deactivates the user) and `provider-admin.service.ts` (does not). The admin route hits the second one.

Evidence: `tools/live/j_qa_provider_reject.py`, run 2026-10-27: 19 of 22 steps pass (pending list, rejection, the list no longer shows it, provider_accounts and provider_profiles rejected). The three failing steps are the user row (active true), and the sign-in (201). The journey is not gated until the reject path and the login gate are fixed (product owner or S to confirm which).
