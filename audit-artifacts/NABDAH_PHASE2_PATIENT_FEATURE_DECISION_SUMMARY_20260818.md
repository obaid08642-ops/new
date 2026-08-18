# Phase 2 Patient feature decision summary

This is a file-level decision summary, not a claim that source changes have been merged. `main` remains the default; QA-only files are candidates requiring explicit integration and build evidence.

Parsed columns: `group` and `provisional_decision`.

| Feature | BLOCKED_ENV_REVIEW | MAIN_REVIEW | QA | REVIEW |
|---|---:|---:|---:|---:|
| ai | 0 | 0 | 0 | 6 |
| diagnostics | 0 | 0 | 0 | 4 |
| family | 0 | 0 | 0 | 1 |
| localization | 0 | 0 | 4 | 0 |
| maternity | 0 | 0 | 2 | 6 |
| medicines | 0 | 0 | 4 | 4 |
| mental_health | 0 | 0 | 2 | 7 |
| navigation | 0 | 0 | 0 | 6 |
| nutrition | 0 | 0 | 2 | 12 |
| other | 0 | 1 | 0 | 1 |
| release_env | 1 | 6 | 0 | 0 |
| reminders | 0 | 0 | 0 | 3 |
| reports | 0 | 0 | 0 | 1 |

## Known actual additions

- Six Patient translation dictionaries and tests.
- `src/utils/medication-notifications.ts` and its test.
- Provider `PlatformMap.tsx`, `.native.tsx`, and `.web.tsx`.
- No new Admin pages; Admin changes remain internal to the existing surface.

All other apparent additions are classified as existing-screen rebuilds, feature rewrites, or unresolved review items.
