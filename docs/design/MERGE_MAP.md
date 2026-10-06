# Screen merge map (owner decisions 5, 6, 7 and the mental-health part of 8), 2026-10-06

**Status: PROPOSAL for owner approval. Nothing is merged, deleted or redirected until the owner approves this map.** Issues #324 (health + family), #325 (settings), #326 (AI assistant). Source of the route list: `docs/design/inventory/screens.json` (one row per route; endpoints from the same file). The proposals below come from route names, templates and the endpoints each route calls; where that was not enough to be sure, the row says **confirm**. I did not read every screen file for this map.

**Rules of the map**
- One screen per user task. Old routes become redirects to the new screen (web: `redirect()` / `next.config` redirect; app: `<Redirect>`), keeping query params; deep links and notification targets keep working.
- A merged screen uses one template (hub / list / detail / form / settings) and tabs or sections, not a copy of each old screen.
- Features removed by the owner (family calls, AI skin analysis, self-assessment scoring, in-app crisis handling) are not rebuilt. Items 3, 10, 11, 17, 18 (UI parts) are done in the batch that owns the screen, not here.
- Implementation happens in the batch that owns the screens (5 health, 6 family, 8 mental health and chronic care, 9 AI, 12 settings), **after approval**. Batch 5 is next after Batch 4, so the health/family part of this map needs your answer first.
- Nothing is dropped silently: each row says what happens to the old screen's content.

## Totals

| Area | Screens now (app / web, redirect routes excluded) | Proposed (app / web) |
|---|---|---|
| Health (`/health/**`, incl. chronic care; the app's `/health/family-hub` is counted under Family) | 20 / 16 | 7 / 7 |
| Family (`/family/**`, `/health/family-hub`) | 10 / 10 | 5 / 5 |
| Settings | 10 / 9 | 7 / 7 |
| AI assistant | 5 / 9 | 2 / 2 |
| Mental health | 2 / 7 | 2 / 4 (decision 8, not a merge) |
| **Total** | **47 / 51** | **23 / 25** |

## 1. Health (decision 5, issue #324)

New screens: **Health hub, Vitals, Sleep, Medications, Medical profile, Records, Wearables.**

| New screen | Old routes (app) | Old routes (web) | Old becomes | What the merged screen is / what is removed |
|---|---|---|---|---|
| `/health` Health hub | `/health` | `/health`, `/health/score` | redirect (`/health/score` → `/health`) | Hub keeps the health score, vitals summary, next appointment and shortcuts. The separate "score" detail page becomes the score card on the hub (one `GET /health/score`). |
| `/health/vitals` Vitals | `/health/vitals`, `/health/vitals-log`, `/health/trends` | `/health/vitals`, `/health/vitals/log`, `/health/trends` | redirect | One screen, tabs **Today · History · Trends**; "Add reading" is a sheet on it (the old log form). Removes: the duplicate list screens and the stand-alone trends page (same data: `/health/vitals`, `/health/vitals/summary`, `/health/trends`). |
| `/health/sleep` Sleep | `/health/sleep-score`, `/health/sleep-tracker` | `/health/sleep` | redirect | One screen: last-night score + the log + "add sleep". Removes: the separate score page and tracker (both read `/health/sleep`). |
| `/health/medications` Medications | `/health/medications`, `/health/medication-reminder-list`, `/health/medication-reminder-add`, `/health/refills`, `/health/chronic-medications`, `/health/smart-reminders` (already a redirect), `/health/reminders` (already a redirect), `/health/actionable-order` (**confirm**) | `/health/medications`, `/health/refills`, `/health/chronic-medications`, `/health/actionable-order` (**confirm**), `/health/smart-reminders` (redirect to `/reminders`) | redirect | One screen, tabs **Today's doses · All reminders · Refills · Chronic**; "Add reminder" is a form sheet. All of it reads the same reminders endpoint family (`/health/reminders`, `/health/chronic-meds`). `actionable-order` has no endpoint of its own and no board of its own: I propose it becomes the "Order these medicines" action on Refills (owner decision 18 button); **confirm** its purpose. |
| `/health/profile` Medical profile | `/health/conditions-allergies`, `/health/chronic-disease`, `/health/edit-profile`, `/health/emergency-contacts`, `/health/health-id` | `/health/conditions-allergies`, `/health/chronic-diseases`, `/health/emergency-contacts`, `/health/health-id` (already `/reports/passport`) | redirect | One "my medical file": sections **Basics (edit) · Conditions and allergies · Chronic diseases · Emergency contacts · Health ID card**. Edit is the old edit-profile form. Removes: four list screens that were the same medical profile (`GET /medical-profile`, `/health/chronic-diseases`). Emergency contacts: see Family, row E. |
| `/health/records` Records | `/health/reports`, `/health/prescriptions` | `/health/reports`, `/health/timeline` | redirect | One screen, tabs **Reports · Prescriptions · Timeline**. The prescription detail stays `/prescriptions/[id]` (Batch 1, already rebuilt); this tab lists them. |
| `/health/wearables` Wearables | `/health/wearables` | `/health/wearables` | keep | Unchanged (device list + data). |

Removed with no replacement: none in Health except duplicates.

## 2. Family (decision 5 + decision 3, issue #324)

Decision 3 (family calls not built): any call/video entry in family screens is removed; family chat stays.

| New screen | Old routes (app) | Old routes (web) | Old becomes | What the merged screen is / what is removed |
|---|---|---|---|---|
| A. `/family` Family hub | `/health/family-hub`, `/family` (today a redirect **to** the hub: reversed so `/family` is canonical), `/family/permission-request`, `/family/permissions` (group part) | `/family`, `/family/permission-requests`, `/family/permissions` (group part) | redirect | Members, group, invite entry, and an inbox section **Requests** (the pending permission requests with accept/decline) on the hub. Removes: the separate request list and group-permissions screens. |
| B. `/family/[memberRef]` Member | `/family/member-health`, `/health/family-member-detail` (redirect) | `/family/[memberRef]` | redirect | One member screen: health records (`/family/member-records/:id`) and that member's permissions (edit, remove from group). Removes: member-health and the per-member part of permissions. |
| C. `/family/calendar` Calendar | `/family/calendar`, `/family/shared-calendar`, `/health/family-calendar` (redirects) | `/family/calendar` | redirect | One shared calendar. |
| D. `/family/chat` Chat | `/family/chat`, `/health/family-chat` (redirect) | `/family/chat` | keep | Stays (decision 3). No call button. |
| E. Emergency contacts | `/family/emergency-contacts` | `/family/emergency-contacts` | redirect to `/health/profile#emergency` | **Confirm:** two endpoints exist (`/family/emergency-contacts`, `/health/emergency-contacts`) for what looks like one concept. Proposal: one list in the Medical profile, used by the emergency button's "send my location to my family" (decision 14). If they are different data (family members vs my own contacts) the reviewer should say so before this row is approved. |
| F. `/family/add` Add / join | `/family/invite`, `/family/join`, `/family/scan`, `/health/add-family-member` (redirect) | `/family/invite`, `/family/join`, `/family/scan`, `/health/add-family-member` (redirect) | redirect | One screen, tabs **Invite · Join with code · Scan QR**. Removes: three near-identical form screens. |

## 3. Settings (decision 6, issue #325): 21 routes → 7 screens

| New screen | Old routes (app) | Old routes (web) | Old becomes | What the merged screen is |
|---|---|---|---|---|
| `/settings` Hub | `/settings` | `/settings` | keep | Account summary and the list of sections below; no content of its own besides the summary (web hub today reads privacy, security, sessions and storage: those move to their screens). |
| `/settings/notifications` | `/settings/notifications-settings`, `/settings/notifications` (redirect) | `/settings/notifications`, `/notifications/settings` (Batch 0 screen) | redirect | One notification-preferences screen (`/users/me/notification-settings`). **Confirm** web has two routes for it. |
| `/settings/privacy` Privacy and data | `/settings/privacy`, `/settings/data` | `/settings/privacy`, `/settings/data` | redirect | One screen, sections **Privacy · My data (storage, export) · Delete account**. |
| `/settings/security` Security | `/settings/security` | `/settings/security` | keep | Security settings and active sessions (sign out a session). |
| `/settings/language` Language and appearance | `/settings/language` | `/settings/language` | keep | Language and theme in one place (theme control moves here from wherever it is duplicated). |
| `/settings/help` Help and support | `/settings/help`, `/settings/feedback`, `/settings/support-chat` (redirect to `/support/chat`) | `/settings/help`, `/settings/feedback` | redirect | One screen: FAQ, send feedback, open support chat. |
| `/settings/about` About and legal | `/settings/about`, `/settings/terms` | `/settings/about` | redirect | About, terms, privacy policy links (`/system-config/public`). |

## 4. One AI assistant (decision 7, issue #326): 14 routes (5 app, 9 web) → 2 screens per client

| New screen | Old routes (app) | Old routes (web) | Old becomes | What it is / what is removed |
|---|---|---|---|---|
| `/ai` Assistant | `/ai-assistant`, `/ai/triage`, `/ai/symptom-checker` (redirect), `/ai/symptom-timeline` (redirect), `/ai/chat-doctor` (redirect), `/ai/prescription-translator` | `/ai`, `/ai/triage`, `/ai/symptom-checker`, `/ai/symptom-timeline`, `/ai/chat-doctor`, `/ai/prescription-translator`, `/ai/report` | redirect (to `/ai?mode=symptoms`, `?mode=prescription`, `?mode=report`) | One conversational screen with three starters: **Describe my symptoms** (routes to a specialty with a "book a consultation" button), **Explain my prescription / medicine** (leaflet text + "ask the pharmacist"), **Explain my report**. The symptom timeline becomes the conversation history. Disclaimer on every answer and the urgent-help button first for red-flag symptoms are UI parts of decision 15 (behaviour, limits and the 100-prompt test set are backend, queue item). Until OpenCode's single endpoint lands, the screen calls the existing `POST /ai/triage` and `POST /ai/ocr-translate`. **Confirm:** web `/ai/chat-doctor` reads `/chat/threads` (human doctor threads?), not an AI: it is listed in decision 7, so it merges, but I want to be sure it is not the doctor-chat entry (that lives at `/chat`). |
| `/ai/monthly-report` | `/ai/monthly-report` | `/ai/monthly-report` | keep | Stays separate (a report, decision 7). |
| removed | `/ai/skin-analysis` | `/ai/skin-analysis` | route removed (404/redirect to `/ai`) | Decision 4: AI skin analysis is deleted, not rebuilt. |

## 5. Mental health (decision 8, issue #327; not a merge, listed because it was asked)

| Screen | Old routes | Result |
|---|---|---|
| Hub | app `/mental-health/hub` (+ redirects), web `/mental-health` | keep; gets the single **"Need urgent help?"** button (opens the phone dialer; number from admin config, never hard-coded). |
| Mood journal | app `/mental-health/mood-journal`, web `/mental-health/mood` | keep. |
| Breathing, meditation | web `/mental-health/breathing`, `/mental-health/meditation` (app: sections of the hub today) | keep (optional: one "Relax" screen with two tabs; owner's call). |
| Therapist booking | web `/mental-health/therapist-match`, app redirect to consultations | keep as a link into consultations filtered to the mental-health specialty. |
| Self-assessment | web `/mental-health/self-assessment` (app: redirect) | **removed** (no scoring). |
| Crisis contacts / crisis support | web `/mental-health/crisis-contacts`, app redirect to `/emergency?view=crisis` | **removed** (no in-app crisis handling); replaced by the urgent-help button. |

## 6. What this map does NOT touch
Pharmacy templates: the "Rx required" badge, the "online only" badge and the "استشر طبيب" cart button (decisions 10 and 11) go into the pharmacy templates when the reviewer's backend part lands. Doctor profile (17) and "order the prescription's medicines" (18) are done in Batch 2 / Batch 5 screens when their backend parts land.

## 7. Questions for the owner
1. Approve the health, family, settings and AI maps above (or mark rows to change)? Batch 5 and Batch 6 slices wait for this.
2. Family emergency contacts vs the user's emergency contacts: one list or two (row E)?
3. `/health/actionable-order`: what is it for (row "Medications")?
4. Breathing and meditation: two screens (as today) or one with tabs?
5. `/ai/chat-doctor` on web: confirm it is an AI-assistant entry, not the human doctor chat.
