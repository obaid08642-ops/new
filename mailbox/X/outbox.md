# Lane X outbox

## 2026-11-07 12:30 UTC — hourly check: #2445 live-gate red fixed
Status: in progress
PR: #2445 (CI: pushed fix 8a0606ff, pending), #2448 / #2424 (live gate running; other checks green so far), #2376 / #2420 / #2366 (not re-read this hour)
What changed: #2445 live gate shard 2/5 was a real regression, not a flake: journey j_web_search_suggest reads role=combobox / aria-controls / aria-autocomplete on the Home search field at load, and the lazy field only had them after the first focus. The plain field now carries the collapsed combobox attributes and points to an empty hidden listbox; the live field still replaces it on first focus. web tsc + full vitest green locally. The journey was not touched.
- Lighthouse is red on #2424, #2445, #2448 (same script-budget cause as #2376, not a regression of those PRs; patient-production-ci and CodeQL are green on them).
Left / blockers / questions: unchanged from the 12:40 entry: #2376 needs the decision (A: icon-record refactor PR, B: land #2445/#2448 first). Waiting for the lead's answer in the inbox; no new order this hour.

## 2026-11-07 12:40 UTC — order 1 item 1 (#2376): blocked on a design choice; items 2-3 pushed; item 4 has nothing open
Status: blocked (#2376 only); everything else waiting for GitHub CI (runners were queued at 11:10, nothing had started)
PR: #2376 (lighthouse red: -1.7 KB /ar, -1.5 KB /ar/c, -7.1 KB /ar/consultations/doctors needed), #2445 #2448 #2424 #2420 #2366 (CI queued)
What changed: nothing new in code since the 12:00 report except experiments that I reverted.
- Tried making ConsultState client-only (`ssr:false`): only -0.75 KB on the doctors page. Not kept.
- Doctors page cost (brotli, manifest-based): layout 24.8 KB + CoreShell chunk 14.2 KB + consult card chunk 9.9 KB + filters sheet 2.4 KB = 51.3 KB; /ar = 46.3 KB. The CoreShell chunk carries two icon records (fill record 57 glyphs ~7.8 KB gz, line-icon record 32 glyphs ~5.3 KB gz) that every shell page ships. Real savings need either per-glyph modules for the line-icon record (like the fill record) plus a smaller fill core list (needs call-site changes in ~60 files), or splitting CoreShell. I did not start this blind: it is a large refactor of shared design components.
- Item 4: the owner colour stack (#1961, #1968, #1971, #1974, #1980-#1990) is no longer among the open PRs (merged or closed), so item 0 has nothing to do; item 1 (M6 ordering rows) lists only blocked rows besides what is built.
Left / blockers / questions:
- Decision for the lead: (a) approve the glyph/icon-record refactor as its own PR (I would do it: line-icon per-glyph modules first, ~-2 KB everywhere, then fill core trimming), or (b) merge #2445 and #2448 first (they bring /ar under) and treat /ar/c and doctors as a second step. Until CI numbers for #2445/#2448 are in, I cannot tell if /ar/c passes. I will start (a) on a new branch x/icon-record only after CI shows which of the six PRs are green, because of the 3-open-PR cap.
- The hourly task will check CI of the six PRs and fix any red.

## 2026-11-07 12:00 UTC — order 1: all six PRs taken over, merged with main, pushed (CI pending)
Status: in progress
PR: #2376 (CI: lighthouse RED, CodeQL check red 3 s), #2445 (pending), #2448 (pending), #2424 (pending), #2420 (pending), #2366 (pending)
What changed:
- #2445 `design/web-lazy-search`, #2448 `design/web-lazy-home`: merged main, tsc + full vitest green locally (449 files). #2448: one test asserted the literal `<OrderAgainCard` in home-quick-tiles; now it asserts `<OrderAgainGate` and that the gate lazy-imports the card (same intent, not weakened).
- #2424 `design/site-notice`: the web part was already complete (server component, no client JS, action tokens, six languages, no noindex, default ON, tests). Added the backend half: GET /config now carries `features.site_notice_enabled = true`, an admin feature-flag row with that key switches it off; spec added; backend tsc, config jest (11 pass), dtolint 0 locally.
- #2420 `design/nursing-options`, #2366 `design/invoice-ui-2`: merged main; the only conflicts were generated docs/design inventories, regenerated with tools/design/screen-inventory.mjs (--check clean), not hand-merged. web tsc + vitest green locally.
- #2376: merged main earlier; CodeQL run on the head commit is green now. Lighthouse still over budget, identical to before: script 175748 / 175533 / 181229 B vs 174080 on /ar, /ar/c, /ar/consultations/doctors (needs -1.7 / -1.5 / -7.1 KB). From the build manifests (brotli): layout chunks 24.8 KB are common; the doctors page adds the CoreShell chunk (14 KB, with the 57-glyph fill record 21 KB raw and the 32-glyph line-icon record 13 KB raw) and the consult card chunk (10 KB). I tried trimming the fill core list (-27 glyphs): about -3 KB but 99 type errors and a codemod that duplicates FillAnyName and cannot fix client data-driven icons, so I reverted it (too invasive to do blind).
Left / blockers / questions:
- #2376 needs a real cut of ~7 KB on the doctors page (candidates: per-glyph modules for the line-icon record in src/Icon.tsx like the fill record; not loading CoreShell's full tab/search code on consult pages). I will work on it next. After #2445 (-3.7 KB on /ar) and #2448 land, /ar should pass; /ar/c (-1.5 KB) and doctors do not yet.
- Rule 6 cap (3 open PRs): I now hold six taken-over PRs because the order told me to take them all over; I opened no new PRs. Question: ok to treat them as one block, or tell me which to drop?
- Local Lighthouse is not possible (no docker daemon here); I measure from `.next/server/app/**/page_client-reference-manifest.js` entryJSFiles + the .br sizes, which matched the CI difference between pages within 0.5 KB.

## 2026-11-07 11:00 UTC — order 1, item 1: #2376 design/web-budget
Status: in progress
PR: #2376 (CI: pending after merge of origin/main, tip 121719fc)
What changed: took over the branch, merged origin/main (no conflicts), tsc and `next build` pass locally, pushed to the same branch. Branch commit says "not yet under the Lighthouse budget" (last CI: script 175748 B on /ar, 175533 on /ar/c, 181229 on /ar/consultations/doctors, budget 174080). Local Lighthouse needs the CI local-api backend, so I use CI numbers.
Left / blockers / questions: waiting for CI numbers, then cut first-load JS further (no budget change) and fix CodeQL. Hourly scheduled task created (trig_01W1c9avbsUPuCzYaJ9qcJe8, fires into this session). #2445, #2448, site notice, #2420, #2366 not started (the rules say not to start the next item while the previous PR is red).

