# Lane L outbox (newest at the top)
Format per entry: `## <UTC time> — <item>` / `Status: done | in progress | blocked` / `PR: #n (CI: green/red/pending)` / what changed (3-6 lines) / left, blockers, questions.

## 2026-11-28 16:35 UTC — LOOP cycle: #2809/#2810/#2811 green; #2812 and #2813 red, root-caused and fixed on their branches
Status: in progress
PR: #2809 (CI: green 30/30), #2810 (CI: green 30/30), #2811 (CI: green 30/30), #2812 (CI: fix pushed, re-running, 0 failed so far), #2813 (CI: fix pushed, re-running, 0 failed so far)
#2812 failure: Patient Mobile typecheck, one error — app/(tabs)/consultations/index.tsx used SERVICE_ICONS without importing it (my miss in the original PR; the neighbouring files import it from packages/ui-native/src). Fixed by adding it to the existing ui-native import (commit 0846639 on l/pa-raw-color). No other file in the PR had the problem (checkout PHARMACY_TONE and Avatar SERVICE_ICONS imports verified).
#2813 failure: typecheck passed; 1 of 2488 tests failed — src/components/__tests__/ui-accessibility.test.ts pins the literal source string hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} for the shared Button in ui.tsx. Tests are not mine to edit, so the two Button hitSlops keep the object form (uniform/symmetric, RTL-identical) and the baseline was regenerated honestly from main: patient-app 48 -> 12 (not 8), total 104 -> 68 (commit 5b79b82 on l/pa-left-right). PR body updated: the ui.tsx 4 join the deliberately-left list; clearing them needs the lead to update that contract test.
Mailbox/main re-checked this cycle: no new orders, main still 4069e2f, no merges yet, no conflicts. Items 6-7 stay parked on the token-layer decision in the entry below.
Left: confirm both fix runs settle green next cycle.

## 2026-11-28 14:31 UTC — L1 items 6-7 (admin no-raw-color 167, admin client-token-sync 144): blocked on a token-layer decision — measured evidence
Status: blocked
PR: none (no branch started; opening one would be a redesign, not a ratchet slice)
What I measured on main 4069e2f before touching anything:
- The 167 admin no-raw-color hits are ~160 hex/rgba occurrences spanning 73 distinct values. Only 2 of those values exist in packages/design-tokens/tokens.json (#FFFFFF, and #23B5CE — the retired teal solid start). ~15 occurrences match admin's own CSS vars; the rest are Tailwind palette values (slate/teal/green/rose scales), chart series colours, and third-party brand colours in ai-control (#4285F4, #10A37F, #F55036...).
- Admin has no token layer to swap onto: admin/package.json has no @nabd/design-tokens dependency, nothing imports tokens.css or var(--nabd-*), and there is no generated admin token module (sync-client-tokens generates only patient-app/provider-app files; sync-token-css only patient-web's mirror — both generators live in tools/design, outside lane L).
- Admin instead carries its own identity in admin/src/styles/globals.css ("V3 Ultra-Premium — Forest Ink #1E332E, Cream #FDFDFC, Fair Mint #5FD9B3") as :root vars (--background/--foreground/--line/--brand/--brand-deep/--canvas/--surface/--ink/--muted). Those 11 definitions are themselves 11 of the 167. Note the gate's EXEMPT_FILES names admin/src/app/globals.css, a path that does not exist; the real file is admin/src/styles/globals.css.
- Client-token-sync (item 7) is the same wall from the other side: it counts admin literals that tokens.json does not declare (144), so it only falls when admin colours become token values or get an exempt home.
Decision the lead needs to make (my recommendation is A):
A. Give admin a token layer first (a lead/design PR: generated admin token module or tokens.css mirror + globals.css :root re-pointed at it, gate exemption for the definition file at its real path). Then lane L can clear items 6-7 mechanically, file by file, exactly like items 1-2.
B. Declare admin's V3 palette the admin token set: exempt globals.css :root as the definition site, and let lane L swap page hexes to var(--brand)/var(--ink)/var(--muted)... only where a var exists — that clears ~15 occurrences, not 167, and the baseline stays high.
C. Confirm admin really should be re-skinned onto @nabd/design-tokens (nearest token per colour, light+dark) — that is a visual redesign of the live console (73 values change), which I should not start as silent ratchet slices.
Until one of these lands, items 6-7 are parked; everything else in L1 is open as PRs. If the lead picks A or C, I will slice by screen group as ordered (catalog-manager 81 and security 39 are the big ones).

## 2026-11-28 14:31 UTC — LOOP cycle: CI check on #2809-#2813, no new orders
Status: in progress
PR: #2809 (CI: 23/30 success, 7 running, 0 failed), #2810 (13 success, rest queued/running, 0 failed), #2811 (3 success, rest queued/running, 0 failed), #2812 (1 success, rest queued, 0 failed), #2813 (1 success, rest queued, 0 failed)
Mailbox re-read: no new lead orders (mailbox head is my own outbox push 682c51c); origin/main unchanged at 4069e2f, so no conflicts to repair and nothing merged yet. mergeable_state reads "blocked" on all five = required checks still running, not conflicts.
Left: CI is draining serially; next cycle re-checks and fixes anything red on the same branches.


## 2026-11-28 14:26 UTC — L1 items 1-5 opened (5 PRs); items 6-7 next
Status: in progress
PR: #2809, #2810, #2811, #2812, #2813 (CI: pending on all five at report time; zero failures seen so far — #2809: 21 success / 9 running, #2810: 10 success / rest queued or running, #2811-#2813 mostly queued)
Lane L is live. Items 1-5 of order L1 are done locally, self-reviewed (every diff touches only admin/**, patient-app/**, patient-web/** plus its own tools/design baseline, all ≤ 37 changed lines) and opened as the five PRs below.
Left: items 6 (admin no-raw-color 167, in slices) and 7 (admin client-token-sync 144, in slices) are next, one PR per slice. Baseline-json conflicts between sibling L PRs are expected; the conflicting one gets origin/main merged + gate --update per LOOP.md.
Questions / needs lead: collected under the individual PRs below and in their bodies (favicon retired brand, manifest theme_color export, 'silver' tier id, hitSlop {8,8,4,4}, measured/map left). Note: LOOP.md says max 3 open PRs while order L1 and the owner's relay say up to 6; I followed L1 (5 open). Say the word if 3 is the real cap and I will hold new PRs until slots free.

## 2026-11-28 14:26 UTC — L1 item 3: patient-app no-left-right 48 -> 8
Status: done
PR: #2813 (CI: pending)
Full-bleed left/right pairs -> start/end (Header, OfflineBanner, BottomSheet, Loading, Toast layers, Spotlight overlay); Header language menu manual isRTL pair -> start: 60; Toast accent border manual isRTL pair -> borderStartWidth/Color; Input underline borders -> borderStart/EndWidth; uniform hitSlop objects -> hitSlop={n}; Avatar dot/badge/stack -> end/start. Baseline 104 -> 64 total.
Left (8, deliberate, in PR body): Badge 2 + SearchBar 4 = non-uniform hitSlop {8,8,4,4} (no logical hitSlop form in the repo; symmetric, RTL-neutral); SpotlightRenderer 1 = measured targetLayout.x; MapPrimitives.web 1 = map coordinate space.

## 2026-11-28 14:26 UTC — L1 item 2: patient-app no-raw-color 10 -> 2
Status: done
PR: #2812 (CI: pending)
OfferCard/FIcon tones -> SERVICE_ICONS.health.tone / PHARMACY_TONE (values unchanged); Header shadowColor -> tokens teal solid.from, dot border -> lightColors.s; NabdLogo ternaries inverted (same logic, token access no longer a trailing literal); Avatar fallback tones derived from the SERVICE_ICONS map (same 8, same order). Baseline patient-app 10 -> 2.
Left / needs lead (2): 'silver' loyalty-tier id in src/constants/index.ts:37 and the tier union in src/core/domain/entities/Commerce.ts:68 are data identifiers, not colours — renaming is a data change, exempting is a gate decision.
Riskiest swap for eyeball: Header shadow #23B5CE -> token #1FA2B8 (the design system's own contrast correction of that teal).

## 2026-11-28 14:26 UTC — L1 item 1: patient-web no-raw-color 13 -> 3
Status: done
PR: #2811 (CI: pending)
The 9 page hits were tone names as string literals; all now come from SERVICE_ICONS (health/nursing/pharmacy tones, values identical), following the health page's existing pattern. manifest background_color -> THEME_COLOR.light (generated canvas mirror). Baseline patient-web 13 -> 3.
Left / needs lead (3): favicon.ico/route.ts (2) serves the retired teal shield gradient — no token carries those hexes, icon.svg documents the teal shield as retired 2026-09-29, and route.test.ts asserts its 64 viewBox (brand + test decision); manifest theme_color #D42A38 (1) needs a generated export for color.action.primary.bg (theme-color.ts only exports canvas; the generator is outside lane L).

## 2026-11-28 14:26 UTC — L1 item 4: admin no-emoji-in-ui 15 -> 0
Status: done
PR: #2810 (CI: pending)
✗/✕ -> × and ✅ -> ✓ (gate-allowed glyphs, already paired with ✓ in the same files); 🟢 -> Tailwind status-dot span in the command-center heading; 🎉/🔐/🔒/⚠️ dropped where the surrounding text or the red delayed-chip already carries the meaning. No new icons added. Baseline 37 -> 22 (all remaining entries are provider-app, lane K).

## 2026-11-28 14:26 UTC — L1 item 5: admin no-left-right 1 -> 0
Status: done
PR: #2809 (CI: pending)
dashboard.tsx Live Demand Clusters marker: left: <x>% -> insetInlineStart: <x>% (LTR identical). Baseline 104 -> 103, admin entry gone.
For the lead to eyeball: the cluster panel has no map underlay, so in RTL the abstract cluster positions now mirror with the layout; if the coordinates must stay pinned physically, this line should be reverted and exempted instead.
