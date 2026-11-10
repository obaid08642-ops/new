# Owner decisions and agreements (history from the old lead session, sanitized for a public repo)
No secrets, server names or personal data here. The full old chat is NOT published (the repo is public).

## Working rules
- Reply to the owner in short Egyptian Arabic. Act as if the owner is present; follow every session until the work is done.
- Never skip/disable/quarantine tests; never raise performance budgets; never --no-verify.
- Secrets never pass through chat, GitHub text, the repo or sessions; the owner sets them on the server or in GitHub settings.
- Server changes only through ops runs on branch review/server-inspect that the owner approves; production checks are GET only; ops tasks print names and counts only.
- DB changes: dry run → plan → owner approve → backup → verify → rollback path. No volume deletion without explicit approval; never delete running images.
- Never serve unscanned uploads; never cache private pages.
- The lead never approves or merges its own PRs. No model names in commits/PRs.
- Token budget (2026-11-07): small contexts; state files on GitHub; sessions woken every 3–4 h.

## Product / infra decisions
- One bigger VPS at launch (now 4 GB to save cost); RAM upgrade at launch; standby VPS and KSA hosting pending owner decision.
- LiveKit stays self-hosted; no paid managed services without price approval; no external free-API routers (code/data must not go to unknown providers).
- Red "under construction / trial version" notice on every website page: informational only, six languages, design tokens only, admin flag `site_notice_enabled` default ON, no noindex (PR #2424).
- Public pages keep the last good cached copy during outages (stale-if-error); private pages never cached. Edge cache verified HIT 2026-11-07.
- Design identity and translation rules: see AGENTS.md (binding).
- Earlyoom: dry run done (run 97); apply only after owner approval.
- External uptime check exists; auto-reboot (R15) stays in dry-run until the owner enables it.
- Plugins (2026-11-07): no claude-mem, no free-API router; automation recommender maybe later on the owner's Mac.

## History in brief
- 11-01 OVH renewal failed → outage 11-02; owner paid; site back 11-03.
- 11-03: runs 97–100 deployed (incl. admin passkey fix #2438). 11-03→11-07 subscription stopped all sessions.
- 11-07: run 101 deployed main@641bbe2f. Heavy sessions replaced: lanes X/Y on two other accounts (mailbox branch), Lead 2 / F3 / P3 here.

## Owner to-dos
GitHub secrets for uptime alert mail; Moyasar/APNs/social login keys; decisions above; test admin passkey login and report.

## 2026-11-09 old lead — OWNER DECISIONS (refund + sick-leave document), binding
REFUND (owner approved; old lead's additions approved): cancel >= 2 h before = 100%; < 2 h = 50% money OR 100% wallet credit (patient chooses); patient no-show = 0%; provider cancels or no-show = 100% immediately. The policy text is shown before payment and the patient ticks "I agree" (KSA e-commerce law: terms stated before contract). Six languages.
SICK LEAVE → renamed. Never call our document "إجازة مرضية / sick leave" (KSA: official sick leave only via Seha; unofficial issuing is an offence). Our document = "تقرير طبي / Medical report" stating the recommended rest period (from/to, days).
- Patient can request it at booking (tick/reason); doctor can issue with or without a request, sets the period, diagnosis text optional (patient privacy).
- Document like the invoice: platform name + logo, doctor name, specialty, licence number (SCFHS), facility, date, period, QR to our verify page, unique doc number; app/web view + PDF.
- Seha link: after issuing, the doctor sees a notice "if you granted rest days, register the sick leave on Seha and enter its number here". Optional field (not blocking) for the Seha sick-leave number; format-validated; editable by the issuing doctor only; audit-logged.
- Until the number is added the document shows "Seha registration: pending"; once added it shows "Registered on Seha: <number>" + "verify on Seha" text, the patient gets a notification, and the PDF regenerates with it.
- Reminders to the doctor if a rest period was given and no number after 24 h and 72 h; admin list of reports without a Seha number after 3 days.
- We do NOT verify the number with Seha (no API); the employer verifies on Seha. Footer: "Official sick leave is issued via Seha".
Owner: Z backend first, then W (doctor) and X (patient).


## 2026-11-09 old lead — OWNER DECISION: NO WALLET (replaces "100% wallet credit")
The wallet stays removed; do not build a credit/balance system. Late cancellation (< 2 h before) gives the patient a choice:
(a) 50% refund to the original card, or
(b) ONE free reschedule of the same booking (same provider, same service, no new payment) within 14 days. Rescheduled visit then cancelled < 2 h or no-show = 0%. If the provider has no free slot in those 14 days or cancels the rescheduled visit = 100% refund to the card.
Unchanged: >= 2 h before = 100% card refund; patient no-show = 0%; provider cancels/no-show = 100% card refund at once; policy shown before payment with "I agree". Six languages.
Until (b) ships, (a) is the only option (already live). Z backend, X patient (web+app), V admin refund-policy page shows this table.


## 2026-11-10 04:45 UTC old lead — DECISIONS (owner delegated "take the decisions")
1. Provider no-show reported by patient: video = refund at once, but max 2 auto-refunds per patient per 30 days (3rd+ goes to admin review first). Clinic/home visits = refund held until the 24 h dispute window closes, then paid automatically unless the provider disputes (admin decides). (= options a + b.)
2. Free reschedule (late-cancel option b): GO, build it (Z backend, X web+app).
3. REFUND_POLICY_VERSION: follows the stored admin policy (hash/version saved with each acceptance), not a code constant.
4. 2-hour table applies to doctor, lab, radiology and nursing bookings. Pharmacy orders: 100% refund until the pharmacy accepts/prepares; after dispatch only for wrong/damaged items (photo + admin review).
5. Invoice after refund: issue the credit note together with the invoice (ZATCA style), do not net the paid total.
6. national_id: asked only when the patient requests a medical report (or the doctor issues one and it is missing, the patient is asked to add it before download); stored like other personal data, shown in full only on the report.
7. Provider no-show live journey: yes, with a directly set past slot in the test env.
8. Run 112 (read-only diagnostics) pushed by old lead: server-ops 42756850654, waiting for owner.


## 2026-11-10 09:50 UTC Lead 3 — decision (within owner decision 1)
- The no-show auto-refund cap (2 per patient per 30 days) counts only automatic video refunds; admin-upheld/released clinic-home refunds and admin review refunds do not count.

## 2026-11-10 20:00 UTC old lead — OWNER APPROVED PROVIDER/ADMIN MERGE MAP (docs/review/PROVIDER_ADMIN_MERGE_MAP.md), decisions delegated to the lead: change NO scenario or operation, only improve UX.
Row 1 (two approve/reject paths): APPROVED. First make `POST /providers/:id/reject` refuse an empty reason too; then, only after grepping every client (admin, provider-app, patient apps, tools/live journeys, docs) shows NO caller of the second path, make it answer 410 for one release, then remove. If any caller exists, repoint it to /admin/providers/:id/* first.
Row 2 (two payout pages): APPROVED. Keep payouts.tsx as the one place (approve/pay/reject); finance-suite.tsx keeps totals and links to it; replace window.prompt/confirm with the shared confirm sheet. Same endpoints, no behaviour change. Check first there is no second payout path on the provider side.
Row 3 (two hospital staff controllers): APPROVED. Move the handlers into one module; URLs, DTOs, guards unchanged; both modules tests must pass.
Row 4 (three ways to create staff): NOT YET. Do only the verification: list every caller of invite / accept-invite / operators / hospital staff create (this repo + tools/live + apps), and how permissions differ. Report in outbox; no change until the lead decides. Existing staff must keep working in any case.
Rule: one PR per row, existing journeys (j_*) and unit tests must stay green, no skipped tests.
