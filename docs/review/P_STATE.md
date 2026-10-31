# Session P state (provider app + admin), 2026-10-31

Context is nearly full; a fresh P should start from this file. Rules: AGENTS.md; one branch `p/<item>` from main per PR; no raw colours (admin: Tailwind classes / currentColor, `npm run no-raw-color` in `packages/design-tokens`, baseline 418); provider-app has no locale files (inline AR/EN, say so in the PR); admin text is Arabic.

## Setup that works
- provider-app: `cd provider-app && npm ci --ignore-scripts --legacy-peer-deps`; gate `npx tsc --noEmit -p .` and `npx jest`.
- admin: `cd admin && npm ci --legacy-peer-deps --ignore-scripts`; gate `npx tsc --noEmit`, `npx vitest run`.
- backend: `cd backend && npm ci --ignore-scripts --legacy-peer-deps`; gate `npx jest <area>`, `npx tsc --noEmit`, `npx nest build`, `python3 ../tools/audit/dtolint.py`, and from the repo root `node tools/audit/clientbodies.js > f.json && node tools/audit/dtocheck.js f.json`. The full suite and `test/security`, `test/journeys` were not run locally; CI runs them (live gate shards).
- Registration golden payloads: `UPDATE_GOLDEN=1 npx jest src/screens/registration` rewrites ALL goldens; keep only the `api` content of the files you changed (restore `uploads_before_refactor` and untouched files from git).

## Done (merged unless noted)
Earlier: #2166, #2170, #2175, #2177, #2179, #2189, #2195, #2196, #2203, #2211.
Session P2, 2026-10-31 (all open, awaiting the lead reviewer): #2228 G6 resubmit + tests; #2229 IBAN creates the bank row; #2230 legacy approve/apply removed; #2231 job accept/complete guards for lab and radiology; #2234 provider-app call room + doctor chat attachments; #2235 G8 admin service-offers page; #2237 lab results review proposal (owner decision A/B/C); #2238 end-to-end audit (read, not run); #2239 admin facility invitations and members page.

## Still to do
1. **Owner/F decision from the audit:** `provider-admin.service.ts:171` approves pending bank rows together with the provider, so after #2229 the separate approve-bank step never sees the first IBAN. Recommended: remove that line, but check that payouts require an approved bank first (session F).
2. **Run the end-to-end journey on a live stack** (see the last section of `docs/review/PROVIDER_E2E_AUDIT_2026-10-31.md`); pharmacy, nursing and consultation completion were not read to the end.
3. **Item 9 leftovers:** three staff-creation flows and two `/hospital/staff` controllers; the nursing "Pricing Model" duplicate screen (provider-app); two payout systems in admin (session F). Not started because each changes who can create accounts or which screen providers use.
4. **Admin native dialogs:** about 70 `window.confirm` / `prompt` calls in `admin/src` (users-management, gdpr, finance-suite, catalog-manager, system-ops, content-growth, ...). A shared promise-based confirm/reason dialog would replace them mechanically; not on the original list, so not started.
5. **Call room hold and audio-route handling** (`VideoCallRoom.tsx`): needs the native call-kit integration, left open in #2234.
6. After #2237 is decided by the owner: build the chosen lab-result release (B = second person only for critical results).

## Backend notes already sent to S (in PR descriptions)
Insurance per offer is boolean only (decision 30 needs companies and classes); migrate inline lab `base64` reports into /storage; `lab-results.service.ts` copies `report.url` that nothing writes now; per-session completion for nursing programmes needs an owner decision.
