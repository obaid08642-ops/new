# Provider personal-data erasure (PDPL): admin-assisted flow

Owner decision 2026-11-13: erasure of a provider's personal data is done by an admin through the existing provider-erasure service. There is no self-service "delete my provider account" at launch, and no facility-facing view of its providers (the `providers/enterprise` routes are admin only; a facility-facing view is after launch).

## Who may do it
An admin whose role has both `user.edit` and `gdpr.manage`, with step-up authentication (the route is `@StepUp`). The action is irreversible and the admin UI asks for a typed confirmation.

## Steps
1. **Verify the request.** The provider (or the facility, for a staff member) asks in writing from the contact on the account; the admin confirms identity out of band (the registered phone or email), and records the request in the support ticket (date, who asked, who verified).
2. **Check what must stay.** Orders, pharmacy orders, appointments, bookings, payments, ledger entries, withdrawals and audit logs are shared clinical / financial records and are kept for audit (legal retention); they are not erased. Tell the requester this in the answer.
3. **Provider with an account:** admin dashboard, Users, the user, Delete (`DELETE /admin/users/:userId`). The service (`ProviderErasureService`, Issue 1541) first removes everything the provider owns, matched against all of the provider's ids (login user, provider-app account, public profile): profile, account, capabilities, slots, pending revisions, files and stored images / documents, the search documents, and the public page / sitemap entry (cache tags are purged). Then the user's own records are purged. Admin accounts cannot be deleted this way.
4. **Orphan profile (no live account):** `DELETE /admin/provider-profiles/:profileId`. It refuses (`provider_profile_has_account`) when the profile still has a live account: delete the account instead, never half.
5. **Check:** the provider's public page returns 404, the provider no longer appears in search or the sitemap, and the response of the delete lists the counts removed per collection. Attach the counts (no personal data) to the ticket.
6. **Answer the requester** within the PDPL period (30 days) with what was erased and what was kept and why.

## Not covered at launch
- A facility asking to erase one of its staff members' data: the facility writes to support and an admin follows the steps above.
- A facility-facing list of its providers (`providers/enterprise`): after launch; it must resolve the facility from the token, never from the URL or body.
