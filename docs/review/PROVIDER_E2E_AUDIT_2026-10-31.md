# Provider end-to-end audit: sign-up, approval, services and prices, receive, accept, complete

Session P2, 2026-10-31. Method: reading the code path of each step on `main` plus the PRs of this session. **Nothing here was run against a live stack**: no Mongo-backed run of the whole journey was possible in this environment, so every line is "read", not "observed". Payments and payouts (session F) are out of scope.

| Step | What happens (file) | Result |
|---|---|---|
| Sign-up | Wizard `start`, `step2`, `step3`, `submit` (`provider-onboarding.module.ts`); submit mirrors into `provider_accounts` (pending_admin_approval), builds the contract, emits `provider.submitted_for_review` | OK. IBAN row now created (#2229) |
| Rejected applicant | Login allows REJECTED, app shows the reason and "Resubmit" (`PendingDashboard.tsx`), resubmit returns the account to pending and clears the old reason | OK, pinned by tests (#2228) |
| Approval | `provider-admin.service.ts approve`: SCFHS gate, role flip, session revoke, commission, profile active | OK, but see finding 1 |
| Services and prices | `provider/services/:vertical` (G1), nursing price and modes (G2, G3), admin view (G8, #2235) | OK |
| Receive | `GET /provider/jobs/queue`, patient identity withheld until acceptance (`provider-job-privacy.ts`) | OK |
| Accept | `POST /provider/jobs/:type/:id/accept` | Gap fixed in #2231 (finding 2) |
| Complete | `POST /provider/jobs/:type/:id/complete`, `upload-report`, radiology publish | Gap fixed in #2231 (finding 3) |

## Findings

1. **Provider approval also approves the bank row (decision needed).** `provider-admin.service.ts:171` sets every pending bank account of the provider to `approved` inside `approve`. Before #2229 there was no row, so nothing happened; now the IBAN from registration exists and is approved together with the provider, so the separate admin step "approve-bank" / "reject-bank" (#2203) never gets a pending row after a normal approval. Options: keep (approval is the one review, drop the separate bank buttons for the first IBAN) or remove line 171 so the bank is reviewed on its own (then payouts must already require an approved bank; that is session F's code and I did not check it). I recommend removing line 171, but it changes who can be paid, so it needs the owner and F.
2. **Generic accept skipped the payment rule for lab and radiology.** Only nursing was checked. The facility app's "Accept & Confirm" uses this route. Fixed in #2231: card must be paid, insurance needs the coverage decision, cash only at the facility.
3. **Generic complete reached REPORTED / REPORT_PUBLISHED with no result.** For lab it needed `upload-report`; for radiology it skipped the two-person publish. Fixed in #2231.
4. **Not verified, still open for a run on a live stack:** pharmacy order completion (offers, dispatch, delivery), nursing complete after arrival, consultation complete with a call, and the end of a lab booking from the app through `upload-report` to the patient seeing it. These use other services (`pharmacy`, `home-care`, `appointments`) that I did not read to the end.
5. **Lab results release has no second-person check** (proposal #2237, owner decision).
6. **Radiology reachable states:** `complete` on a radiology job that is already REPORT_READY now passes the guard and sets REPORT_PUBLISHED (universal COMPLETED to COMPLETED, no transition). It is harmless but the two domain states mean the same thing; worth merging in a cleanup, not changed here.

## What to run on a live stack (the part this audit could not do)
Register a lab, reject it, resubmit, approve it, set two services and prices, book as a patient (cash at the facility, card paid, insurance), accept from the facility app, upload a result, and check the patient list and push. Also try accepting the card booking before payment: it must answer `card_payment_not_completed`.
