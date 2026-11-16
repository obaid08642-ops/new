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
