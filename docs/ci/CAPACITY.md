# CI capacity (PR #2318)

Owner rule (2026-10-31): every PR and commit runs ALL suites. No path gates, no skipped suites.
Concurrency only cancels an older run of the same PR; never on main, schedule or manual runs.
`tools/ci/test_workflow_concurrency.py` enforces this in the Policy job.

## Wall time per workflow
"Before" is read from earlier Actions runs (queue waits excluded). "After" has NOT been measured:
nothing here has run on Actions yet. Fill it from the first runs of this PR.

| Workflow / job | Before | After |
|---|---|---|
| live-gate (5 shards, each) | ~20 min | not measured |
| patient-production-ci backend (30 chunks) | ~13-18 min | not measured |
| patient-production-ci patient-mobile | ~10 min | not measured |
| patient-production-ci patient-web | ~3 min | not measured |
| acceptance | < 1 min | not measured |

## Done in this PR
- Pinned actions/cache v4 = 0057852bfaa89a56745cba8c7296529d2fc39830 (from `git ls-remote`).
- live-gate: Playwright browser cache; Next.js build cache (admin, patient-web).
- patient-production-ci: npm cache for the packages/ui and packages/shared-contracts jobs.
- Schemathesis runs on every PR again (plus main and nightly).

## Not done yet (stated, not hidden)
- Sharding the backend job (30 sequential chunks) behind the same required check name.
- Building backend and web once per live-gate run and sharing it as an artifact across the 5 shards.
  Acceptance runs ts-jest from source in a separate workflow, so it cannot share that artifact.
- buildx layer cache for docker builds (image-scan, isr-disk, capacity-prod-shape, ops-rehearsal);
  setup-buildx v3 = 8d2750c68a42422c14e847fe6c8ac0403b4cbd6f, build-push v6 = 10e90e3645eae34f1e60eeb005ba3a3d33f178e8.
- npm cache for security, edge-html-worker, isr-disk, status-worker, turn-relay, uptime, waiting-room-worker.
- Other workflows still have workflow-level `paths:` filters (lighthouse, p15, image-scan, sbom, zap,
  mongo-healthcheck, mongodump-oneoff, turn-relay, uptime, design-gate, capacity*). Not changed here; owner to decide.

## Jobs per PR
Not counted from a run yet; count them from the first Actions run of this PR.
