# Client needs-review [backend] lines: triage (2026-11-16, lane B)

Source: every `[backend]` entry in `docs/design/needs-review/*.json` (459 lines, 426 after merging app/web duplicates). I did not read all 426 one by one; the counts below come from simple keyword rules and are **approximate**. The entries named "verified" were checked against the code by hand. Rule used: a gap is fixed in a PR only when it is small, the data already exists on the server, and it has a test; everything else is listed here with why.

## Verified: already solved, or the line is out of date (no backend work)
| line | what the code shows |
|---|---|
| "urgent-help number missing from `GET /system-config/public`" (batches 8, 9, app and web) | The number exists: `GET /mental-health/urgent-help` (public), admin-set key `mental_health_urgent_help` (`mental-health-urgent-help.controller.ts`); the mental-health and emergency pages already use it. The assistant screens (`AssistantView.tsx`, `symptoms-client.tsx`) read `/system-config/public` instead: a CLIENT change, read the other endpoint. |
| "visit-report sends no patient notification" (provider-journeys) | `visitReport` completes through `transition`, which emits `homecare.booking_state_changed`; `notifications.service.ts` `onHomecareState` notifies the patient for every state incl. COMPLETED (high priority). |
| `GET /lab-results/mine` refused for a patient | fixed earlier (a patient token is allowed). |
| G6 "server gate for rejected providers" | exists (`auth.guard.ts`), see #2690. |

## Fixed in this batch
- Ordering booking view had no cancel reason (m6-ord08-10, app and web): `cancel_reason` added, derived from the stored state history (#2704).

## Needs a decision, not code (13 lines, one decision)
**Admin page permission differs from the endpoint permission** (admin-catalogue, admin-finance, admin-ops-monitoring, admin-system, admin-customers-growth): e.g. the page needs `catalog.read` but `POST /medicines/admin/catalog` needs `catalog.create`; a role with only the page permission gets a 403 on that call. Two ways to settle it per call: (a) the page hides the action unless the role also has the endpoint permission (client), or (b) the endpoint accepts the page permission (this WIDENS access: an owner/security decision, never done silently). I recommend (a) by default and (b) only where the owner says the role should be able to do it.

## Removed-feature leftovers (owner decision "removed features", remove with the module)
The home search still returns community posts; `community.comment_added` notifications still go to `/community/post-detail` (4 lines). Safe to delete when the community module is deleted; deleting a module is the owner's call.

## Data that does not exist on the server (feature work, needs a source)
About 37 lines say a field is "not sent" or "no endpoint": `wait_time`, `follow_up_price/days`, doctor `certificates` and `services`, lab booking `results` and test names, referral amounts and points-to-riyal rate, article author doctor id, product `pregnancy_info`/`related_product_ids`, provider-map open state/price, policy renewal date, past triage conversations. Each needs a data source or an owner decision first (the field is invented otherwise). Cheap ones I can do when asked: article `author_doctor_id` (schema + DTO + admin field), the referral/points config on `/loyalty/config` (owner gives the numbers).

## Owner / assets
18 lines about seeded images (CDN files for 10 lab/radiology items do not exist, QA saw 404s), empty seeded lists, test data. The owner supplies the pictures; no stock images. 12 lines say the legal texts and policies exist in Arabic and English only: same kind of decision as the location names (closed as won't do on 2026-11-16, #1831): the owner decides whether the legal texts get four more languages.

## The rest (about 330 lines)
Mostly design-session notes written next to a backend path: the distribution is `m6` 100, `admin` 55, `parity` 43, `doctor` 19, others smaller. I can take them in groups when the lead picks a group; one PR per group, each with a test.

## Suggested order
1. The permission decision above (13 lines, one answer clears them).
2. The assistant screens reading `/mental-health/urgent-help` (client, patient safety: today the emergency button can be hidden).
3. The "not sent" fields the owner wants first (wait time, follow-up price).

---
## Second pass (2026-11-16, later): groups m6, doctor, provider, parity read by hand (about 170 lines)

### More lines verified STALE against the code (no backend work; the design notes were written before the fixes landed)
| line (file) | what the code shows now |
|---|---|
| "a seeded PATIENT session gets 200 on `GET /pharmacy/inventory/expiry`" (provider-admin-inventory) | `nabd-extensions.controller.ts:153-154` has `@Roles(...PROVIDER_ROLES, 'provider', UserRole.ADMIN)` ("a patient gets 403"). |
| "the one-open-withdrawal check ignores `AWAITING_SECOND_APPROVAL`" (provider-journeys) | `payouts/provider-payouts.controller.ts:15` `OPEN_WITHDRAWAL_STATES` = PENDING_ADMIN_APPROVAL, AWAITING_SECOND_APPROVAL, APPROVED_FOR_PAYOUT. |
| "nothing subscribes to `pharmacy.offer.selected`, the pharmacy gets no notification" | `pharmacy-offer.service.ts:659` calls `notifyPharmacyNewAllocation(selected.allocation)` right after the event. |
| "the backend does not store `sound`/`vibration` notification settings" (parity-account) | `users.service.ts:283` `NOTIFICATION_PREFERENCES` includes them and `updateNotificationSettings` stores them. |
| "visit-report completes without the patient signature" (provider-journeys) | `home-care-compat.module.ts` `visitReport` refuses `complete` without `signature` (`patient_signature_required`). |

### The real bug found in m6 (needs a decision, see the outbox of 2026-11-16 16:30)
`slotsForProvider` (labs, radiology, home-care) builds slot instants at the opening hour as UTC: a lab open 09:00 (Riyadh) gets 09:00Z = 12:00 Riyadh. Not changed: it moves every slot instant and the web picker compensates by showing UTC.

### What the rest of these groups are
- **doctor (19), parity-doctors, doctor-card:** public doctor payload fields that do not exist (`education`, `services`, `certificates`, `wait_time`, `is_online`, `reviews_data` from a branch, gender, clinic coordinates which are private by design). Feature work needing a data source, or an owner choice on privacy (exact clinic location is withheld on purpose).
- **parity-pharmacy / parity-pass:** public product DTO lacks `cold_chain`, `interactions`, `pregnancy_info`, `related_product_ids`; the category list accepts one form and one brand. These are small additive fields (the medicine schema already has them): the lead can ask for one PR; note they widen what the public page exposes, so a medical reviewer should say which of them may be public.
- **parity-account:** OTP throttle (3 per 10 minutes) versus the app's 60 s wait, register-then-OTP flow differences, search without price fields: product decisions between app and web, not defects.
- **provider (14):** mostly known gaps (position route for nursing visits, per-item custom test request endpoint, admin "request changes" note not shown in onboarding progress).
- **Still unscanned at that time:** `admin` (55, 13 are the permission decision) and a long tail; the admin group is read in the third pass below.

---
## Third pass (2026-11-16, evening): the admin group (about 55 lines) read against the code

Almost all of it is stale: the design notes describe the backend before the fixes of the guard sessions. Verified in the code:
| line | what the code shows now |
|---|---|
| "sensitive admin writes are role-only, no `@RequirePermissions`" (catalogue approvals, provider approve/suspend/reactivate/deltas, users ban/unban, CMS publish, appointment cancel, payouts execute/reject, refunds decide) | `src/common/admin-sensitive-write-permissions.spec.ts` pins a named permission for each of these writes (CI fails if one loses it); the payout routes are `admin-finance.controller.ts:53-68` with `FINANCE_PAYOUT_APPROVE`. The old `/admin/finance/withdrawals/:id/execute` route in the note no longer exists. |
| "impersonation mints a full access token for any user with no permission, case, expiry or audit" | `admin-impersonation.controller.ts`: `USER_IMPERSONATE` permission, a reason, at most 15 minutes, a session row, an audit entry, staff targets refused. Every `force-*` and `override-insurance` action in `admin-authority.module.ts` names a permission. |
| "`controlled` is not editable (EDITABLE_FIELDS / DTO)" and "sfda_price does not exist" | `medicines.service.ts` `EDITABLE_FIELDS` has `controlled` and `sfda_price`; `medicines.dto.ts:90` has `controlled`. |
| "GET /admin/finance/commissions declared three times, the wrong one served" | one declaration remains under the enterprise finance controller with `FINANCE_READ`. |

Left in the admin group (not defects of the code, decisions or features): the page-permission versus endpoint-permission mismatch (13 lines, one decision, see the first section), the admin "pending approvals" aggregate endpoint (the page asks nine list endpoints), feature flags that nothing reads except the AI gateway and `sms_enabled`, the theme page posting to a route that does not exist (client), "reject deletes the provider's uploaded files while a re-submit is allowed" (a real product risk: please decide whether rejection should keep the files), "any edit of an approved medicine, even a price fix, sends it back to medical review" (a product decision, safe by default), and the public routes the admin pages call that are open by design (`/loyalty/config`, `/storage/upload` with its own ownership check, `/support-session/context`).

### Result of the whole triage
Of the roughly 330 lines I read by hand across m6, doctor, provider, parity and admin, 10 turned out to be stale, 1 was a real small gap fixed (cancel reason, #2704; refund amount, #2708), 1 a real bug needing a decision (slot times), and the rest are features that need a data source or an owner decision. No further backend PR is justified without a decision from the lead.
