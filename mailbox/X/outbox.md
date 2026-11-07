# Lane X outbox

## 2026-11-07 11:00 UTC — order 1, item 1: #2376 design/web-budget
Status: in progress
PR: #2376 (CI: pending after merge of origin/main, tip 121719fc)
What changed: took over the branch, merged origin/main (no conflicts), tsc and `next build` pass locally, pushed to the same branch. Branch commit says "not yet under the Lighthouse budget" (last CI: script 175748 B on /ar, 175533 on /ar/c, 181229 on /ar/consultations/doctors, budget 174080). Local Lighthouse needs the CI local-api backend, so I use CI numbers.
Left / blockers / questions: waiting for CI numbers, then cut first-load JS further (no budget change) and fix CodeQL. Hourly scheduled task created (trig_01W1c9avbsUPuCzYaJ9qcJe8, fires into this session). #2445, #2448, site notice, #2420, #2366 not started (the rules say not to start the next item while the previous PR is red).

