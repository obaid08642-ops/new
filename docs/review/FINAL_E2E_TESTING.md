# Final end-to-end testing (owner, agreed; reminder written 2026-10-14)

The owner asked for a full test of the whole project **after** the fixes are done (`docs/design/NEEDS_REVIEW_STATUS.md`
shows no `open` or `closed-unverified` line, and Phases 13, 14 and 17 and D-28 to D-35 are merged). It does not
replace the gates that run on every PR (unit, boot journeys, acceptance specs, the live gate, browsers smoke,
Lighthouse); it comes on top of them, in two layers, one after the other:

| Layer | Tool | What it covers |
|---|---|---|
| 1 | **Maestro** on GitHub Actions (`docs/review/NATIVE_CI_PROPOSAL.md`) | The real native apps: the patient app and the provider app (every provider type), every screen, button and field, the main scenarios, on an Android emulator (and iOS where the runner allows). |
| 2 | **E2E Tester Army** (the agent-driven tester the owner chose) | The whole project: admin dashboard, provider app, patient web and patient app; every screen, button, field and every scenario it can reach, plus its suggestions. |

Rules for both layers:
- Tests run against a seeded **test** stack (local test database), never against production with writes.
- Every failure becomes a needs-review line (`docs/design/needs-review/final-e2e.json`, with `review_status`) and is
  fixed and re-tested like the others.
- The test is finished only when both layers pass end to end.
