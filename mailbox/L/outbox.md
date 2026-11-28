# Lane L outbox (newest at the top)
Format per entry: `## <UTC time> — <item>` / `Status: done | in progress | blocked` / `PR: #n (CI: green/red/pending)` / what changed (3-6 lines) / left, blockers, questions.

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
