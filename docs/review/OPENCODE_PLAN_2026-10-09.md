# OpenCode plan, 2026-10-09 (owner-approved routing)

This file is the **only** task list for the four OpenCode sessions below. Read it from `origin/main` at the start of every session and before every new chunk:

```
git fetch origin && git show origin/main:docs/review/OPENCODE_PLAN_2026-10-09.md
```

Everything here overrides the older queue files where they differ.

## 0. Who does what

| Session | Works on | Base branch | Branch names |
|---|---|---|---|
| **OC-A commerce** | backend issues of pharmacy, orders, payments, insurance (list in §4) | `main` | `oc/A-<n>` |
| **OC-B care** | backend issues of consultations, labs, radiology, nursing, provider and admin journeys (§5) | `main` | `oc/B-<n>` |
| **OC-C content** | backend issues of health, family, maternity, mental health, nutrition, AI, articles, loyalty, settings, support, public pages, sign-in (§6) | `main` | `oc/C-<n>` |
| **OC-D phases** | port phases 13–23 from the old OpenCode branches into reviewed PRs (§7) | `main` | `oc/P<phase>-port` |

- **UI-only issues (169) are not yours.** The design session builds them. If a backend change of yours needs a screen change, write it in the PR body under "UI for the design session".
- **The lead reviewer does these, so do not touch them:** the 20 issues closed by your waiting PRs Q-2…Q-22 and D-16, the 22 issues in §8, and the 10 issues already fixed.

### Queue C items (owner decisions with acceptance specs) are split the same way
Each item is built **only from its spec** in `backend/acceptance/d-<n>/`, which must pass and must not be edited. Do your session's D items before its issue chunks.

- **OC-A:**
  - D-25 payment method by service
  - D-26 cancellation and refund policy
  - D-30 insurance first
  - D-31 double taps
  - D-37 insurance relay
- **OC-B:**
  - D-12 SFDA price ceiling
  - D-13 no pharmacy available
  - D-19 lab result deep link
- **OC-C:**
  - D-1 community removal
  - D-2 leaderboard
  - D-4 skin analysis
  - D-9 challenges
  - D-15 AI limits
  - D-29 search
  - D-36 and D-38 legal texts
- **OC-D, after P16 and P20:**
  - D-28 security sweep
  - D-33 backups
  - D-34 operations page
  - D-35 two admin devices
- **Already done, do not start:**
  - D-8, D-10, D-11, D-14, D-24, Q-12, Q-13 (merged)
  - D-16 (#584) and D-17, with the reviewer

## 1. Git rules: binding, no exceptions

1. **Never push to `main`.** It is protected; a push is refused and counts as a failure.
2. **Never force-push**: no `-f`, no `--force`, no `--force-with-lease`. Never `git push origin HEAD:main`. Never `git reset --hard` on a pushed branch. Never rebase or amend after the first push.
3. Start every chunk from a fresh main:
   ```
   git fetch origin
   git checkout -B oc/A-1 origin/main      # your session letter + the chunk number
   ```
4. **One chunk = one branch = one PR**, with 1 to 8 issues **in the same module**. Do not mix modules.
5. **You never merge**, not even your own PR. The lead reviewer merges.
6. Before every push, check that you are on your own branch:
   ```
   git status
   git branch --show-current     # must print oc/A-<n> (or B/C/P)
   git log --oneline -5 origin/main..HEAD
   ```
   If the branch name is wrong, stop and fix it before pushing.
7. Push only your branch: `git push -u origin oc/A-<n>`.

## 2. How to fix one issue: the same steps every time

1. **Read the issue on GitHub.** The body names the exact client `file:line` and usually the backend `file:line`. Read **only** those files and the code they call. Do not read the whole repo.
2. **Check it is still open in the code.** `main` moves fast. If it is already fixed, comment on the issue `already fixed by <commit sha>` and move on (do not close it yourself; the reviewer closes).
3. **Write a failing test first**, in a `*.spec.ts` next to the code:
   - run it and copy the red output;
   - then fix the code until it is green;
   - never edit a test you did not write in this chunk.
4. **Keep the change small and real:**
   - no mock data, no placeholder text, no fake success, no `any` in new code;
   - every new DTO field gets a real validator (`@IsString`, `@IsBoolean`, `@IsIn`, `@ValidateNested`, …);
   - grep before you use a name: `grep -rn "<field or route>" backend/src`.
5. **Server text rule:** never send a sentence in one language. Send a **code** (for example `status: "awaiting_pharmacy"`) and numbers. If a sentence must come from the server, add it to `backend/src/modules/i18n/i18n.service.ts` in ar, en and ur, and send the key.
6. **Removed features stay removed:** ambulance/SOS dispatch, community posts, leaderboard, skin analysis, mental-health scoring and crisis handling, patient wallet. If an issue asks to keep one, comment `removed feature (owner decision)` and skip it.
7. **If an issue needs an owner decision, or more than one module, or more than about 150 changed lines:**
   - do not build it;
   - comment `BLOCKED: <one-line reason>`;
   - add the label `needs-owner` if it is a decision;
   - move on.

## 3. Before you open the PR: tests, merge check, CI

Run all of these and paste the **last lines of each** into the PR body. Do not open the PR while any one is red.

```
cd backend
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py          # run from backend/, must end with exit 0
cd ..
node tools/audit/clientbodies.js > /tmp/c.json && node tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
```

**Merge check, so the PR can merge without conflict or errors:**

1. Bring in the latest main (merge, not rebase):
   ```
   git fetch origin
   git merge origin/main
   ```
2. If there is a conflict:
   - open each conflicted file and keep **both** changes when they do not overlap;
   - if both sides changed the same lines, keep main's version and re-apply your change on top;
   - run `git diff --name-only --diff-filter=U` until it prints nothing, then `git commit`.
3. Run the whole gate again after the merge.
4. Push, then open the PR **into `main`**:
   - title: `[OC A-<n>] <short summary>`;
   - body: one line per issue `Closes #<issue> — <what changed>`, then a section `UI for the design session` (or "none"), then the gate output.

**After opening the PR, watch CI:**

1. Open the PR's **Checks** tab.
2. When a check is red, open its log, find the first error, fix it, and push a new commit on the same branch.
3. Never re-run a check to get green, never push an empty commit, and never skip, disable or delete a test.
4. **`lighthouse` is red on every PR (known), so ignore it.** Every other check must be green.
5. If the PR shows "This branch has conflicts", repeat the merge check above.
6. When everything is green, write one comment: `ready for review`. Then start the next chunk.

**Report after each PR** (to the owner, in one message): the PR link, issues closed, issues commented BLOCKED, tokens used.

## Patterns for the common issue types (read once)

- **"field missing in the answer" (pharmacy name, courier, totals, rating count…):**
  - add it to the DTO or mapper that builds the answer (search the service for `patientDto`, `toPublic`, `governedView`);
  - add a test that the field is present and that private fields stay out (no phone, national id, iban, raw gateway data).
- **"two endpoints / two names for the same field":**
  - keep the one the clients call;
  - make the other read the same data;
  - do not delete a route a client still calls (grep the clients first: `grep -rn "<route>" patient-app patient-web provider-app admin`).
- **"Arabic-only server text":** apply rule 5 of §2 (codes, or i18n keys in ar/en/ur).
- **"needs availability, not fixed times":**
  - use the existing slot engine (`backend/src/modules/care/slot*.ts`, used by Q-13);
  - do not write a second scheduler.
- **"admin permission mismatch":**
  - the route's `@RequirePermissions` must be a permission the admin page's role has;
  - fix the page's permission key or the route, and add a test in `backend/src/common/admin-sensitive-write-permissions.spec.ts` style.
- **Payments:**
  - never return `client_secret`, raw gateway payloads or the patient id of someone else;
  - a status read must never call the gateway or write.


## 4. OC-A commerce: 58 issues (pharmacy, orders, payments, insurance)
Modules you own: `backend/src/modules/pharmacy`, `payments`, `orders`, `insurance`, `insurance-engine`, `moyasar`.
**Do not edit other modules.** If an issue needs one, comment BLOCKED and say which session owns it.

Suggested chunks:
1. A-1: order answers (pharmacy name, courier fields, rx flag and price per line, governed state on lists).
2. A-2: offers and broadcast exposure (round and radius, offer list states, insurance flags).
3. A-3: final quote (if no writer exists and no spec asks for it, remove the dead `FINAL_QUOTE_READY` branch and say so in the PR).
4. A-4: payments (a read-only status endpoint, retry for governed pharmacy orders, method from the DTO, no raw documents).
5. A-5: insurance under queue item D-37 (spec `backend/acceptance/d-37`).

- #367 — patient-app /pharmacy/order-tracking: Live map and courier (`1e-app`)
- #370 — patient-app /orders: Emergency request status (`1e-app`)
- #374 — patient-web /orders/[orderId]/tracking: Live map, courier position, vehi (`1e-web`)
- #377 — patient-web /pharmacy/reorder: Prescription flag of a line (`1e-web`)
- #381 — patient-web /orders: List has no governed_state (`1e-web`)
- #450 — patient-app /pharmacy/filters: Sort options (`batch-1a-app`)
- #451 — patient-app /pharmacy: Category chips (`batch-1a-app`)
- #454 — patient-app /pharmacy/product-detail: Points line "تكسب [عدد] نقطة" (hid (`batch-1a-app`)
- #456 — patient-app /pharmacy/product-detail: Insurance row (hidden) (`batch-1a-app`)
- #464 — patient-app /pharmacy/wishlist: Availability chip (`batch-1a-app`)
- #472 — patient-web /pharmacy/filters: Filters the page used to offer: dosage fo (`batch-1a-web`)
- #473 — patient-web /pharmacy/[slug]: Pharmacy page data source and base URL (`batch-1a-web`)
- #474 — patient-web /medicines: Medicine rows and pager (`batch-1a-web`)
- #486 — patient-app /pharmacy/scan-prescription: Board RxUpload: 'Use my insuran (`batch-1b-app`)
- #487 — patient-app /pharmacy/pharmacist-chat: System message text written by th (`batch-1b-app`)
- #492 — patient-web /cart: Board element 'use your points' toggle and 'points di (`batch-1b-web`)
- #498 — patient-web /pharmacy/scan-prescription: Board attachments row (several  (`batch-1b-web`)
- #504 — patient-web /pharmacy/scan-prescription: OCR throttle and generic failur (`batch-1b-web`)
- #506 — patient-app /pharmacy/broadcast-status: Delivery time ('يصل خلال') of an (`batch-1c-app`)
- #507 — patient-app /pharmacy/broadcast-status: Preparation minutes ('ready in a (`batch-1c-app`)
- #510 — patient-app /pharmacy/broadcast-status: Search radius and round ('نطاق 3 (`batch-1c-app`)
- #513 — patient-app /pharmacy/final-quote: FINAL_QUOTE_READY is never produced (`batch-1c-app`)
- #520 — patient-web /orders/[orderId]/offers: Offer list: expired, declined and  (`batch-1c-web`)
- #521 — patient-web /pharmacy/final-quote: Revised final price (FINAL_QUOTE_READ (`batch-1c-web`)
- #522 — patient-web /orders/[orderId]/offers/negotiation/[threadId]: System mess (`batch-1c-web`)
- #523 — patient-web /orders/[orderId]/offers: Insurance decision: the patient's  (`batch-1c-web`)
- #524 — patient-web /pharmacy/broadcast-status: Hero line of the board: "range [ (`batch-1c-web`)
- #525 — patient-web /orders/[orderId]/offers/negotiation: Conversation rows (`batch-1c-web`)
- #532 — patient-app /pharmacy/payment: Retry endpoint does not know governed pha (`batch-1d-app`)
- #533 — patient-app /payments/result: Two ways to ask for a payment result, and  (`batch-1d-app`)
- #534 — patient-app /payments/result: Polling uses a POST that calls the gateway (`batch-1d-app`)
- #538 — patient-app /pharmacy/insurance-decision: Payment method sent with the a (`batch-1d-app`)
- #543 — patient-app /pharmacy/checkout: Board rows with no data: pharmacy name,  (`batch-1d-app`)
- #544 — patient-app /pharmacy/checkout: A request edited after the order was cre (`batch-1d-app`)
- #545 — patient-app /pharmacy/checkout: Guests cannot send a request and the pat (`batch-1d-app`)
- #550 — patient-web /payments/result: No GET /payments/status/:ref; the provider (`batch-1d-web`)
- #552 — patient-web /pharmacy/insurance-decision: Accepting needs capabilities t (`batch-1d-web`)
- #553 — patient-web /pharmacy/payment: Payment endpoints return the raw transact (`batch-1d-web`)
- #554 — patient-web /cart/checkout: Server cart no longer read at checkout (`batch-1d-web`)
- #557 — patient-web /pharmacy/payment: Board rows not drawn: points discount, ta (`batch-1d-web`)
- #811 — patient-app /pharmacy/barcode-scanner: Interaction notes (`14b-app`)
- #815 — patient-web /diagnostics/labs/book: Book one lab test (`14b-web`)
- #816 — patient-web /c/[[...category]]: Sort on the catalogue (`14b-web`)
- #817 — patient-web /pharmacy/barcode: Interaction notes (`14b-web`)
- #823 — patient-app /insurance: Claims totals and benefits totals (`7-app`)
- #825 — patient-app /insurance/coverage-check: Company share not shown (`7-app`)
- #826 — patient-app /insurance/benefits-summary: Benefits list (`7-app`)
- #829 — patient-app /insurance/coverage-check: Endpoint answers from stored data (`7-app`)
- #830 — patient-app /insurance/payment-split: Approval number is stored under tw (`7-app`)
- #835 — patient-web /insurance/requests/[requestId]: Strict request state enum (`7-web`)
- #836 — patient-web /insurance: Benefits note is Arabic only (`7-web`)
- #837 — patient-web /insurance/coverage-check: Coverage note is Arabic only (`7-web`)
- #838 — patient-web /insurance: Policy card has no logo, membership number or ex (`7-web`)
- #840 — patient-web /insurance: Refund status shown raw (`7-web`)
- #841 — patient-web /insurance: Provider type shown raw (`7-web`)
- #845 — patient-web /insurance/coverage-check: Endpoint answers from stored data (`7-web`)
- #846 — patient-web /insurance/requests/[requestId]: Approval number is stored u (`7-web`)
- #1136 — app scenario 1: map lines to catalogue:  (`provider-journeys`)

## 5. OC-B care: 26 issues (consultations, labs, radiology, nursing, provider and admin journeys)
Modules you own: `care`, `labs`, `radiology`, `home-care`, `provider`, `provider-ops`, `admin` (backend only), `unified-bookings`.

Suggested chunks:
1. B-1: follow-up link to the original appointment (`follow_up_of`, same patient and doctor) and appointment payload fields.
2. B-2: availability-based times for nursing and home lab (the slot engine), per-lab prices, radiology ids on compatible providers.
3. B-3: provider journeys (allocation states, lab arrived state, home-lab report attachments like N1).
4. B-4: admin journeys (licence review per document, change log for every field, notify the provider). Queue items D-12 (SFDA) and the A39 refund money flow have their own specs; do them only from those specs.

- #384 — patient-app /consultations/doctor/[id]: Favourite and years of experienc (`2-app`)
- #391 — patient-app /consultations/virtual-waiting-room: Wait time unit (`2-app`)
- #398 — patient-web /consultations/cancel-reschedule: Refund policy (`2-web`)
- #402 — patient-web /consultations/book/[doctorId]: Attach reports, points disco (`2-web`)
- #623 — patient-app /diagnostics: Filter 'nearest' (`3-app`)
- #624 — patient-app /diagnostics: Approved labs carousel (`3-app`)
- #627 — patient-app /diagnostics/checkout: Times and days (`3-app`)
- #631 — patient-app /diagnostics/lab-comparison: Price of every lab (`3-app`)
- #633 — patient-web /diagnostics/radiology/[serviceId]: add to my order (`3-web`)
- #639 — patient-web /diagnostics/labs/[labId]: rating (`3-web`)
- #642 — patient-app /nursing/nurse-profile: Booking time (`4-app`)
- #645 — patient-app /nursing: Search and filters (`4-app`)
- #647 — patient-app /nursing/live-tracking: Visit steps (`4-app`)
- #653 — patient-web /nursing/nurses/[nurseId]: Booking form (`4-web`)
- #654 — patient-web /home-care: Duration text (`4-web`)
- #801 — patient-app /consultations/prescription-from-doctor: Prescription notifi (`14a-app`)
- #802 — patient-app /consultations/book/[id]: Follow-up link to the original app (`14a-app`)
- #807 — patient-web /appointments/[appointmentId]: Follow-up link to the origina (`14a-web`)
- #809 — patient-web /consultations/cancel-reschedule: Expected refund (`14a-web`)
- #810 — patient-web /appointments/[appointmentId]: Prescription order from the d (`14a-web`)
- #940 — admin /admin/provider-moderation: Journey 1 / Licence review is a manual (`admin-journeys`)
- #945 — admin /admin/medicines-catalog: Journey 2 / Change log covers price only (`admin-journeys`)
- #947 — admin /admin/catalog-manager: Journey 2 / No items-to-review queue for u (`admin-journeys`)
- #950 — admin /admin/insurance-queue: Journey 3 / Refund approval moves no money (`admin-journeys`)
- #1167 — app scenario 3: result upload:  (`provider-journeys`)
- #1168 — app scenario 3: arrived:  (`provider-journeys`)

## 6. OC-C content: 66 issues (health, family, maternity, mental health, nutrition, AI, articles, loyalty, settings, support, public pages, sign-in)
Modules you own: `health`, `family`, `maternity`, `mental-health`, `nutrition`, `ai`, `articles`/`content`, `loyalty`, `support`, `users`, `settings`, `legal`, `explore`/`search`, `auth` (sign-in normalisation only).

Suggested chunks:
1. C-1: server text to codes (health score and trends, maternity notice, mood values, support and refund statuses, family relations).
2. C-2: public explore filters (facility type, test or service, review count) and catalogue sort, total and filters.
3. C-3: AI answers (triage specialty from queue D-15; history list; report analysis shape).
4. C-4: articles (author doctor id), community leftovers in search and notifications (queue D-1 removal).
5. C-5: loyalty config (referral amounts, points to riyal rate from admin config; challenges under D-9).
6. C-6: legal in six languages (queue D-36 and D-38 specs), privacy switches keys, current-session flag, reviews list.
7. C-7: sign-in (phone normalisation on login, social-login token verification).

- #412 — patient-app /login: POST /auth/social-login: the backend does not verify (`batch-0-app`)
- #431 — patient-web /login: Identifier matching for phone numbers (backend) (`batch-0-web`)
- #446 — patient-web /notifications: Where a notification opens (`batch-0-web`)
- #656 — patient-app /health/vitals: Server text in Arabic only (`5-app`)
- #658 — patient-app /health/prescriptions: Order from the list (`5-app`)
- #659 — patient-app /health/actionable-order: Decision 18 Rx link (`5-app`)
- #660 — patient-app /consultations/summary: Decision 18 on the consultation resu (`5-app`)
- #661 — patient-app /consultations/prescription-from-doctor: Labs and radiology (`5-app`)
- #662 — patient-app /health/reports: Two report endpoints (`5-app`)
- #665 — patient-app /health/emergency-contacts: SOS notifies family (`5-app`)
- #667 — patient-app /health/wearables: Pairing by name (`5-app`)
- #675 — patient-web /health/records: Two report lists (`5-web`)
- #676 — patient-web /health/medications: Edit a chronic reminder (`5-web`)
- #677 — patient-web /health: Score status and component keys (`5-web`)
- #680 — patient-web /prescriptions/[prescriptionId]: Order these medicines (deci (`5-web`)
- #683 — patient-web /consultations/prescription: Labs and radiology from the out (`5-web`)
- #687 — patient-app /family/add: Join relation (`6-app`)
- #698 — patient-web /family/[memberRef]: Permission grants (`6-web`)
- #699 — patient-web /family/add: Invite and join errors (`6-web`)
- #702 — patient-web /family: Member name (`6-web`)
- #737 — patient-app /articles/[slug]: Author link and Book button (`10-app`)
- #738 — patient-app /articles: Search results of type community (`10-app`)
- #739 — patient-app /community/post-detail: Community reply notification (`10-app`)
- #740 — patient-web /articles/[slug]: Author link and Book button (`10-web`)
- #743 — patient-web /search: Search results of type Community (`10-web`)
- #744 — patient-app /loyalty/hub: Purchase-typed challenges (`11-app`)
- #745 — patient-app /loyalty/hub: Referral amounts (`11-app`)
- #746 — patient-app /loyalty/hub: Cash equivalent of points (`11-app`)
- #749 — patient-web /loyalty: Purchase-typed challenges (`11-web`)
- #750 — patient-web /loyalty: Referral amounts (`11-web`)
- #753 — patient-app /settings/about: Legal documents in six languages (`12-app`)
- #754 — patient-app /settings/about: Cancellation and refund text (`12-app`)
- #759 — patient-app /support/ticket: Request status (`12-app`)
- #760 — patient-app /support/chat: Reply of the support team (`12-app`)
- #761 — patient-app /returns/new-request: Reason as free text (`12-app`)
- #762 — patient-app /returns/hub: Time to refund (`12-app`)
- #765 — patient-app /reviews: Aspects sent as codes (`12-app`)
- #766 — patient-app /map: Providers answer (`12-app`)
- #772 — patient-web /settings/privacy: Privacy switches (`12-web`)
- #773 — patient-web /settings/security: End session (`12-web`)
- #774 — patient-web /settings/help: Request status (`12-web`)
- #775 — patient-web /support/ticket: Request status (`12-web`)
- #779 — patient-web /reviews: Reviews list (`12-web`)
- #785 — patient-web /labs/[testSlug]/[citySlug]: Partner laboratories list (`13-web`)
- #786 — patient-web /pharmacies/[citySlug]: Pharmacies list (`13-web`)
- #787 — patient-web /radiology/[serviceSlug]/[citySlug]: City of the service lis (`13-web`)
- #789 — patient-web /doctors/[specialty]/[city]: Rating on the doctor card (`13-web`)
- #796 — patient-web /privacy: Language of the policy (`13-web`)
- #849 — patient-app /maternity/hub: Baby growth tab, fetal week content and week (`8-app`)
- #850 — patient-app /mental-health/hub: Need urgent help? dialer button (`8-app`)
- #853 — patient-app /nutrition/hub: Plan tab (`8-app`)
- #855 — patient-app /programs/active: Next session date and time (`8-app`)
- #858 — patient-web /mental-health: Need urgent help? button (tel:) (`8-web`)
- #860 — patient-web /nutrition/plan: Plan tab (`8-web`)
- #861 — patient-web /maternity: Weekly articles and fetal-week size/image (`8-web`)
- #863 — patient-web /maternity: estimate_notice (`8-web`)
- #865 — patient-web /mental-health/mood: Mood value (`8-web`)
- #871 — patient-app /ai-assistant: Book a consultation by specialty (`9-app`)
- #872 — patient-app /ai-assistant: Urgent-help tel: button (`9-app`)
- #873 — patient-app /ai-assistant: Conversation history (`9-app`)
- #874 — patient-app /ai-assistant: Explain my report (`9-app`)
- #879 — patient-web /ai: Specialty for the booking button (`9-web`)
- #880 — patient-web /ai: Need urgent help? button (tel:) (`9-web`)
- #881 — patient-web /ai: Medicine leaflet text (`9-web`)
- #882 — patient-web /ai/symptom-timeline: Conversation history (`9-web`)
- #886 — patient-web /ai: Report analysis answer shape (`9-web`)

## 7. OC-D phases 13–23: port, do not merge

**What this is:** OpenCode built phases 13–23 on `fix/audit-2026-09`, `opencode/phases-13-21-snapshot` (6c0ed5bf) and `oc/phase-audit`:
- about 520 commits;
- never merged;
- the reviewer's verdict on 6c0ed5bf was **FAIL** (`docs/review/REVIEW_OPENCODE_P15_P21.md` on `oc/phase-audit`, items A–K).

`main` has moved far since (design rebuild, owner decisions, removed features). These are **different** from the needs-review issues above.

**Rule: never merge those branches into anything.** Port one phase at a time onto a fresh branch from `main`:

1. `git fetch origin && git checkout -B oc/P21-port origin/main`
2. Read the phase in `docs/audit/02_AGENT_EXECUTION_PLAN.md` (on `origin/oc/phase-audit`): its **Do** and **Verify**.
3. See what the old work changed for that phase only:
   ```
   git log --oneline origin/opencode/phases-13-21-snapshot --grep "P21"
   git show <sha> -- <path>
   ```
   Copy only the parts that implement the phase's **Do**.
4. **Never bring back:**
   - anything §2 rule 6 lists as removed;
   - anything `main` deleted on purpose. Check with `git log origin/main -- <path>`; if `main` deleted or rewrote a file after the snapshot, keep `main`'s version and re-apply only the missing behaviour.
5. Fix the review items of that phase (table "For OpenCode" in REVIEW_OPENCODE_P15_P21.md):
   - A, B: auth and Phase 21;
   - C: migrations;
   - D, E: audit and security;
   - G: fake data;
   - H, I: client errors and outbox;
   - J: OTA;
   - K: dead code.
6. **Acceptance tests:** get them from the reviewer branch with
   ```
   git checkout origin/review/spec-oc-p15-p21 -- backend/acceptance/oc-<name>
   ```
   Then run `node backend/scripts/run-acceptance.mjs oc-<name>`. **They must pass. Never edit them.**
7. Run §3 (gate, merge check, CI) and open the PR `[OC P21-port] ...` into `main`.

**Order, one phase per PR, and wait for the review of each before the next:**
1. 21 accounts and guests (`oc-auth`, `oc-phase21`)
2. 16 security hardening (`oc-security`)
3. 23 audit trail
4. 20 observability
5. 15 resilience (P15 was green at 00334901; start from that commit's changes)
6. 19 compliance (SCFHS and SPL only if real, no mock)
7. 18 languages (do not delete locale keys still used)
8. 17 UX and accessibility (UI parts go to the design session)
9. 13 owner requirements
10. 14 performance

**Phase 22 (mature-platform extras) waits for the owner's approval; do not start it.**
Branch `oc/P13` (2026-10-09) is based on the old line; redo it as `oc/P13-port` from main.

## 8. Done by the lead reviewer (do not touch)
- #366 — patient-app /pharmacy/order-tracking: Pharmacy name (pharmacy name on the order)
- #375 — patient-web /orders/[orderId]/tracking: Pharmacy name (pharmacy name on the order)
- #417 — patient-app /notifications: Row title and body language (notification language)
- #443 — patient-web /notifications: Notification title and body language (backen (notification language)
- #444 — patient-web /notifications: GET /notifications is registered twice (back (GET /notifications registered twice)
- #511 — patient-app /pharmacy/broadcast-status: Broadcast rounds and offer expir (offer + broadcast expiry scheduler never runs)
- #512 — patient-app /pharmacy/broadcast-status: Offer countdown uses the phone c (server time for countdowns)
- #514 — patient-app /pharmacy/final-quote: Pharmacy name is not in the order det (pharmacy name on the order)
- #907 — admin /admin/catalog-manager: Guard G-PERM-MISMATCH (7) (perm mismatch)
- #920 — admin /admin/content-growth: Guard G-PERM-MISMATCH (1) (perm mismatch)
- #922 — admin /admin/crm: Guard G-PERM-MISMATCH (1) (perm mismatch)
- #933 — admin /admin/financial-ledger: Execute Payout (confirm dialog)
- #935 — admin /admin/payouts: تأكيد الرفض (confirm dialog)
- #939 — admin /admin/provider-moderation: Journey 1 / Provider is not notified o (notify provider on approve/reject)
- #959 — admin /admin/dashboard: Guard G-OPEN (2) (guard on health routes)
- #960 — admin /admin/dashboard: No nav link (nav link)
- #972 — admin /admin/insurance-queue: اعتماد الاسترداد (confirm dialog)
- #973 — admin /admin/insurance-queue: رفض (confirm dialog)
- #994 — admin /admin/ai-control: No nav link (nav link)
- #996 — admin /admin/legal-policies: Guard G-PERM-MISMATCH (1) (perm mismatch)
- #1078 — web scenario 7: missed dose: missing-step (medication.missed never emitted)
- #1143 — app scenario 1: prepare:  (partial allocation confirm)

## 9. Closed by merged work, or by your waiting PRs once merged
- #368 — patient-app /orders: Legacy orders (GET /orders/mine) → Q-8 #602
- #373 — patient-web /orders/[orderId]/tracking: GET /orders/:id/tracking → Q-8 #602
- #376 — patient-web /orders/[orderId]: Reorder through /orders/:id/reorder → Q-8 #602
- #385 — patient-app /consultations/home-visit-tracking: Doctor on the way, map → Q-15 #589
- #392 — patient-app /consultations: Nearest and Available now filters → #587/#588 (Q-12/Q-13)
- #395 — patient-app /consultations/doctor/[id]: Board elements without data → Q-20 #595
- #399 — patient-web /consultations/call-history: List → Q-16 #590
- #401 — patient-web /consultations/doctors: Photo and verified seal → Q-20 #595
- #405 — patient-web /appointments: Specialty line → Q-19 #593
- #479 — patient-app /pharmacy/pharmacist-chat: Send a message, accept the substi → #1222 (patient pharmacy chat roles)
- #484 — patient-app /pharmacy/rx-order: Active prescriptions list payload → Q-10 #585
- #485 — patient-app /pharmacy/scan-prescription: Each OCR line without a medicin → Q-9 #603
- #496 — patient-web /prescriptions: List endpoints return whole prescription doc → Q-10 #585
- #508 — patient-app /pharmacy/broadcast-status: 'Accepts insurance' flag (insura → Q-4 #599
- #518 — patient-web /pharmacy/waiting-for-pharmacy: Governed states OFFERS_READY → Q-3 #598
- #519 — patient-web /orders/[orderId]/offers: Offer card: arrival estimate, "acc → Q-4 #599
- #530 — patient-app /pharmacy/payment: Paid state: governed_state never says pai → Q-21 #596
- #531 — patient-app /pharmacy/payment: Payment method choice (board: Apple Pay / → Q-6 #600
- #648 — patient-web /nursing/nurses/[nurseId]: Public nurse profile → Q-22 #597
- #798 — patient-app /consultations/chat-with-doctor: Window, read-only flag and  → #1240 (D-24)
- #805 — patient-web /chat/[threadId]: Window, read-only flag and allowed compose → #1240 (D-24)
- #859 — patient-web /mental-health/crisis-contacts: Crisis contacts endpoints → #725 (D-8)
- #946 — admin /admin/medicines-catalog: Journey 2 / A price correction un-publis → #1206
- #953 — admin /admin/system-ops: Journey 4 / Feature switch has no effect on cli → D-16 #584
- #1027 — app scenario 2: upload prescription: other → Q-9 #603
- #1049 — app scenario 3: doctor chat: other → #1240 (no direct doctor chat)
- #1141 — app scenario 1: patient accepts:  → #1240 (P5)
- #1161 — app scenario 3: on the way:  → Q-15 #589
- #1164 — app scenario 3: done:  → #1240 + #1207
- #1166 — app scenario 3: result upload:  → #1207/#1228/#1231 (N1)

## 10. UI issues for the design session (not OpenCode)
- **admin** (6): #937, #938, #941, #954, #955, #995
- **journeys** (60): #1011, #1012, #1014, #1015, #1016, #1017, #1018, #1020, #1023, #1024, #1025, #1026, #1028, #1029, #1030, #1031, #1032, #1033, #1034, #1035, #1036, #1038, #1040, #1042, #1043, #1044, #1046, #1047, #1048, #1050, #1051, #1053, #1055, #1056, #1057, #1058, #1059, #1063, #1066, #1068, #1069, #1072, #1073, #1075, #1076, #1077, #1080, #1081, #1082, #1083, #1084, #1086, #1087, #1088, #1089, #1090, #1091, #1092, #1093, #1094
- **patient-core** (29): #408, #409, #410, #411, #413, #416, #420, #421, #422, #424, #426, #427, #428, #430, #432, #433, #434, #435, #436, #437, #438, #439, #440, #445, #560, #566, #567, #568, #569
- **patient-other** (33): #382, #386, #630, #634, #641, #643, #649, #673, #674, #682, #686, #688, #693, #694, #697, #741, #742, #747, #790, #791, #792, #820, #832, #842, #848, #852, #856, #862, #864, #866, #867, #869, #885
- **patient-pharmacy** (22): #362, #379, #455, #466, #467, #469, #475, #477, #478, #480, #481, #482, #493, #499, #501, #529, #537, #548, #551, #559, #812, #818
- **provider** (19): #1096, #1109, #1110, #1111, #1137, #1139, #1146, #1147, #1151, #1163, #1169, #1178, #1179, #1180, #1181, #1182, #1183, #1184, #1198
