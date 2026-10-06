# AGENTS.md — Rules for the implementing agent (Nabd Plus)

Read this file fully at the start of EVERY session. These rules override any default behavior.

## Design rebuild sessions (patient-app + patient-web redesign)
For design-rebuild work (`docs/design/DESIGN_HANDOFF_FINAL.md`):
- **Branches (owner, 2026-10-04):** each step or batch goes on its own `design/<batch>` branch from `main`, with one PR to `main` per batch, screenshots before and after, and a review before merge. The `fix/audit-2026-09` rules below are for the implementing agent only, not for design sessions.
- **Start every session (owner, 2026-10-06)** by reading only the "Next" section of `docs/design/PROGRESS.md` and the rows for the current batch (grep `SCREEN_INVENTORY.md` and `WIRING_REPORT.md` for those routes). Do not read the full files; history is in `PROGRESS_ARCHIVE.md`.
- **After every PR**, update `docs/design/PROGRESS.md` (state / next / open blockers with PR links; keep it under 8 KB, move history to `PROGRESS_ARCHIVE.md`). Follow the steps in `docs/design/README.md`.
- **Owner decisions (2026-10-05), binding:** (A) identity is fixed: canvas `#F5F5F7` plain, action `#D42A38`, coral `#FF4B55`, ink `#0B1B2B`, the Noon Dot logo, Readex Pro, the boards' icons/buttons/cards; never add a colour, logo variant, background pattern or shape that is not on a board (ask the owner), and every PR description includes "Identity check: no new colours/logo/patterns" with the token diff. (B) The login screens are the first screens of Batch 0. (C) Every screen PR passes `docs/design/QUALITY_STANDARDS.md` with the measured checklist in its description. (D) Fetal-week images live on the CDN, not in the app; week content comes from the backend (no mock data). (E) Model effort: high for components 2-4 and for payment, booking, pharmacy offers, insurance and calls; medium for regular screens.
- **Every batch PR (owner, 2026-10-05), same PR, not a separate pass:** the audit in `docs/design/QUALITY_STANDARDS.md` §7 (per-screen element audit; "Mock / placeholder found" in `WIRING_REPORT.md`; runtime check against the seeded backend; 0 unresolved calls and the static web screens classified; a "Needs review" section for anything untraceable or suspect, with backend gaps reported and not fixed by the design session). Colours: only `@nabd/design-tokens` (base palette with dark versions + the 10 service tones), zero raw colours on every screen the PR touches, legacy colours replaced by the nearest token and never kept or added as a token without the owner's approval; lower the `client-token-sync` baseline in every PR and state the new number in the PR description (it never goes up); a token change changes app and web together, no screen-level overrides.
- **Owner decisions (2026-10-06):** test-mode seeders only on the local test database (never staging/production), screenshots of seeded data labelled "test data"; `/` and `/dashboard` show the `ErrorState` with retry when the backend fails and there is no cached copy (decision of 2026-10-06, delegated to the reviewer: public pages keep serving the last good cached copy during an outage (stale-if-error, as large sites do); pages that need the backend for an action (sign-in, booking, payment, orders) are never cached and show the error at the action; the cart is local-first (owner, 2026-10-06: pharmacy orders are broadcast to pharmacies, which answer with offers, so there is no stock check): adding, removing and changing items works without the backend and the cart is kept on the device, and only sending the order needs the backend (on failure: a clear error, the cart kept unchanged); do not add a cap or remove the stale copy); client-side defects from Needs review are fixed in the batch that owns the screen, backend items stay for the reviewer.
- **Translation rule (owner, 2026-10-06), same strictness as colours (`docs/design/QUALITY_STANDARDS.md` §8):** (1) no user-visible text written in a screen or component: button and field labels, placeholders, errors, toasts, empty states, `accessibilityLabel`/`aria-label`, alt text, page titles and meta tags all come from `patient-web/messages/*.json` and `patient-app/src/i18n/locales/*.json`; (2) CI gates `no-literal-ui-string` (ratchet baseline, only down) and `locale-parity` (every key non-empty and translated in ar, en, ur, hi, bn, fil/tl; no English left in a non-English file except brand names); (3) every new key gets all six translations in the same PR, no fallback to Arabic or English in the UI; (4) layout survives every language (RTL for ar/ur, LTR for the rest, buttons grow with the text, locale-formatted numbers/dates/currency, mirrored directional icons); (5) every batch adds en and ur (or hi) screenshots at 390 next to Arabic; (6) every PR reports the literal-string baseline number (old → new) as with `client-token-sync`.
- **Lean process (owner, 2026-10-06; quality rules unchanged, how they are recorded changed):** (1) no screenshots committed or sent to the owner: a temporary screenshot only to compare a screen with its board while building, then delete it; no before/after/compare images; (2) one production build and one runtime check per slice, at the end (dev server while building); Lighthouse only in F82 PRs and once per batch; (3) the element audit and Needs-review are generated by `tools/design/audit-table.mjs` from a compact `docs/design/audit/<slice>.json` (route, element, source, status), notes only for problems, one line each; (4) fix only what the screen being rebuilt needs, other old bugs go to Needs review in one line; (5) at most 2 agents at a time, each given only its screen list and the board, not the full docs; (6) Sonnet 5 medium for normal screens, high only for payment, offers, booking, insurance and calls; (7) report tokens used and screens finished per slice in `PROGRESS.md`. Still binding in every slice: wiring (0 unresolved calls), no mock data, tokens-only colours, translations (six languages, no fallback), dark mode.
- **When context runs low:** commit, push, update `PROGRESS.md`, push again, and stop.

## Your role
You IMPLEMENT the plan. A separate reviewer reviews and merges your work. You never merge.

## Sources of truth (read before coding)
- `docs/audit/02_AGENT_EXECUTION_PLAN.md` — the contract. Do exactly what each task's "Do" says; prove it with its "Verify".
- `docs/audit/01_FINAL_AUDIT_REPORT.md` — the findings (F-ids) with evidence.
- `REVIEW_P*.md` — reviewer verdicts. Every FAIL item in the latest review is mandatory before anything else.
- `AGENT_PROGRESS.md` — your log.

## Branch rules
- Work ONLY on `fix/audit-2026-09`. Never push to `main`. Never force-push.
- Start every session with: `git fetch origin && git checkout fix/audit-2026-09 && git pull --ff-only origin fix/audit-2026-09`
- Never revert code from `[REVIEW-*]` commits.
- The reviewer merges `[REVIEW-FIX]` commits into this branch. Run `git pull --ff-only origin fix/audit-2026-09` before you start AND before every push; never discard or rework a `[REVIEW-FIX]` change.

## Scope rules
- One phase at a time. Do NOT start the next phase until the reviewer has APPROVED the current one (a REVIEW_P<n>.md with verdict APPROVED on main).
- One task = one commit: `[P<n>.<t>] <F-id> <summary>`.
- Never defer, skip, or partially complete a task or a review FAIL item. "Deferred", "remaining", "secondary", or "safe to postpone" are NOT allowed.
- If something is truly impossible, write `BLOCKED: <exact reason>` in AGENT_PROGRESS.md and STOP. Do not work around it.
- Do not change anything outside the task's scope.

## Honesty rules (no hallucination)
- Never claim a result you did not see. Paste the REAL terminal output (last lines) of every Verify command into AGENT_PROGRESS.md.
- Making a checker pass is not the goal; the behavior is. Do not edit a verification tool to make it pass unless the reviewer approved the change.
- No mock data, placeholders, TODO stubs, fake success responses, skipped/deleted tests, `--no-verify`, or `any` in new code.
- Before editing a file, read it. Do not invent functions, fields, or endpoints; grep to confirm that they exist.

## DTO rules (Phase 3 and later)
- Every DTO field has a real validator: @IsString/@IsNumber/@IsInt/@IsBoolean/@IsIn/@IsEnum/@IsArray/@ValidateNested/@IsDateString, plus @IsOptional only where the field is truly optional.
- Free-form JSON only with @IsObject (or @Allow) plus a comment `// free-form: <reason>`.
- Field names must match what the clients (patient-app, patient-web, provider-app, admin) actually send.

## Gate before every push (all must pass; paste the outputs)
```
cd backend
npx tsc --noEmit
npx nest build
npm test -- --runInBand
npx jest --config jest.boot.config.js --runInBand test/security test/journeys
python3 ../tools/audit/dtolint.py            # exit 0
node ../tools/audit/clientbodies.js > /tmp/c.json && node ../tools/audit/dtocheck.js /tmp/c.json   # 0 mismatches
```
If a gate fails, fix it. Never push red.

## When done
Push `fix/audit-2026-09`, then report exactly:
"Phase <n> complete (or: Review round <r> fixes done), ready for review. Tip: <sha>. Gate outputs are in AGENT_PROGRESS.md."
Then STOP and wait.
