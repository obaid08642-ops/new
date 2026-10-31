# Session P state (provider app + admin), 2026-10-31

Context is nearly full; a fresh P should start from this file. Rules: AGENTS.md; one branch `p/<item>` from main per PR; no raw colours (admin: Tailwind classes / currentColor, `npm run no-raw-color` in `packages/design-tokens`, baseline 418); provider-app has no locale files (inline AR/EN, say so in the PR); admin text is Arabic.

## Setup that works
- provider-app: `cd provider-app && npm ci --ignore-scripts --legacy-peer-deps`; gate `npx tsc --noEmit -p .` and `npx jest`.
- admin: `cd admin && npm ci --legacy-peer-deps --ignore-scripts`; gate `npx tsc --noEmit`, `npx vitest run`.
- backend: `cd backend && npm ci --ignore-scripts --legacy-peer-deps`; gate `npx jest <area>`, `npx tsc --noEmit`, `npx nest build`, `python3 ../tools/audit/dtolint.py`, and from the repo root `node tools/audit/clientbodies.js > f.json && node tools/audit/dtocheck.js f.json`. The full suite and `test/security`, `test/journeys` were not run locally; CI runs them (live gate shards).
- Registration golden payloads: `UPDATE_GOLDEN=1 npx jest src/screens/registration` rewrites ALL goldens; keep only the `api` content of the files you changed (restore `uploads_before_refactor` and untouched files from git).

## Done (merged unless noted)
#2166 gap audit; #2170 G1 My services and prices; #2175 G2 nursing registration price; #2177 G4+G5 lab results via /storage, radiology two-person publish; #2179 G3 nursing booking modes; #2189 G9 admin refund-policy page; #2195 nursing inline price error; #2196 licence expiry date in 5 wizards; #2203 bank reject, licences-expiring page, cancel invitation; #2211 reject prompt text. Open: #2178 (docs state, now stale: replace with this file).

## To do, in the reviewer's order (one PR each)
1. **G6 + resubmit P0.** A REJECTED applicant can sign in, sees the reason and "Fix and resubmit"; SUSPENDED stays blocked; resubmit moves REJECTED to PENDING_REVIEW and notifies admin. Backend: `backend/src/modules/provider/services/provider-admin.service.ts:204-222` (reject), `provider-auth.service.ts:156` (login blocks only SUSPENDED), `provider.enums.ts:52` (REJECTED to PENDING_ADMIN_APPROVAL is legal), `provider-profile.service.ts:170/:174` (resubmit needs phones, address.city, provider_documents rows, provider_bank_accounts rows that the wizard never writes). Make the wizard submit (`provider-onboarding.module.ts` submit, step2) write those rows; app: a rejected-state screen showing `rejection_reason` with a resubmit action (find where `PendingDashboard.tsx` handles states, `provider-app/src/context/index.tsx:180,267,340`).
2. **Registration IBAN creates the `provider_bank_accounts` row** (`provider-onboarding.module.ts:148` stores it on the profile only; admin `approve-bank` then returns `no_pending_bank_account`).
3. **Remove legacy** `POST /providers/:id/approve` (`providers.service.ts:227`) and `/providers/apply` (`:133`) after grepping all clients (admin, provider-app, patient apps, tools/live).
4. **Lab "complete" through upload-report**: `provider-jobs.module.ts:215` sets REPORTED with no result.
5. **Calls and chat (provider-app), verify each then fix with a test** (findings in `docs/qa/findings/calls-chat.md`, branch `qa/calls-chat-matrix`, PR #2200): `VideoCallRoom.tsx:179` (P0: refused camera permission, no disconnect, Retry creates a second room, no audio-only fallback), `:162` (reconnect re-enables mic and camera), `:240` (no permission message or settings link), `:18` (no hold or audio-route handling), `shared/ChatSystem.tsx:246` (doctor cannot open attachments: image, file, voice). The doctor chat is in `screens/shared/ChatSystem.tsx`; call room `screens/shared/VideoCallRoom.tsx` (test: `screens/shared/video-call-room.livekit.test.js`).
6. **G8**: admin page for per-provider service offers (`GET admin/service-offers/:vertical`, `provider.controllers.ts:567-571`; params `service_id`, `provider_account_id`).
7. **Lab results review proposal** (`lab-results.service.ts:69`): proposal only in a PR description, no clinical flow change, no user-visible "needs review" text.
8. After the list: end-to-end audit of sign-up, approval, services and prices, receive an order, accept, complete (payments and payouts belong to session F, do not touch).
9. Admin still lacks screens for facility invitations/memberships (endpoints added in #2194); `docs/review/PROVIDER_ADMIN_GAPS.md` UX table lists remaining duplicates to merge (two payout systems in admin, two approve paths, three staff-creation flows, the nursing "Pricing Model" screen, two `/hospital/staff` controllers).

## Backend notes already sent to S (in PR descriptions)
Insurance per offer is boolean only (decision 30 needs companies and classes); migrate inline lab `base64` reports into /storage; `lab-results.service.ts` copies `report.url` that nothing writes now; per-session completion for nursing programmes needs an owner decision.
