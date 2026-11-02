# CI checks must not depend on production (implemented 2026-11-02)

While production was down (since about 13:20 UTC) `runtime contrast (rendered pages, both themes)` went red on every pull request with
`PublicDataUnavailableError: public data unavailable: home`, so a production outage blocked merging unrelated changes. This is the list of
jobs that build or run patient-web against the real API, and a plan to point them at a local stack that CI already knows how to start.

## Which jobs depend on `https://api.nabd.plus/api/v1`

| Workflow / job | What it does with the API |
|---|---|
| `patient-production-ci.yml` / `runtime-contrast` | builds patient-web (`NABD_API_BASE_URL=https://api.nabd.plus/api/v1`), starts it through the nonce server, renders pages in both themes (the failing check) |
| `patient-production-ci.yml` / `patient-web` (build and tests) | same build variable; the build fetches public data for static pages |
| `lighthouse.yml` | same build and start, then Lighthouse on key routes |
| `p15-web-browsers.yml` | `NABD_API_BASE_URL` at workflow level; browser journeys against a patient-web that reads production |
| `stale-if-error.yml` | `NEXT_PUBLIC_SITE_ORIGIN: https://nabd.plus` only (checked separately, not the API) |

`live-gate.yml` already does the right thing: mongo 7 replica set, redis 7, moto, `tools/live/start-backend.sh` on `127.0.0.1:8002`, then
`NABD_API_BASE_URL=http://127.0.0.1:8002/api/v1 INTERNAL_API_BASE_URL=http://127.0.0.1:8002/api/v1 pnpm run build`.

## What was done
1. **Composite action** `.github/actions/local-api`, built from the stack steps of `live-gate.yml`: MongoDB replica set, Redis, an S3 stand-in (moto +
   bucket), the real backend built from the commit and started with `tools/live/start-backend.sh` on `127.0.0.1:8002`, the launch legal texts published with
   `publish-legal-policy.ts` (so `/privacy` and `/terms` answer), and a final probe of health, the doctors list and `/config`.
2. **Switched to it**: `runtime-contrast` (patient-production-ci.yml), `lighthouse.yml`, `p15-web-browsers.yml` (chromium/firefox/webkit). Each now builds and
   serves patient-web with `NABD_API_BASE_URL` and `INTERNAL_API_BASE_URL` at `http://127.0.0.1:8002/api/v1`. No workflow in `.github/workflows` names
   `api.nabd.plus` as a build or test target any more. `live-gate.yml` already ran locally. Every assertion of those checks is unchanged.
3. **Not done**: a separate scheduled "production still renders" smoke check (`uptime.yml`, #2407, already covers reachability).

## Known limits (read before trusting a green run)
- The database starts **empty** apart from the legal texts. The home page works on an empty catalogue (an empty answer hides its sections; only a failed
  request throws), but `runtime-contrast` skips every route that answers 4xx, so the category pages (`/en/c/...`) and other data-dependent routes are
  **not rendered** in this setup: the check passes with less coverage than against production. Seeding a small public catalogue (categories, a few products, a
  doctor, an article) through the admin API is the next step and is not done here.
- Lighthouse budgets were set against production-sized pages; scores on the empty local site may differ (higher or lower). If the audit fails on a budget,
  re-baseline it once, in a separate change.
- Added time per job is unmeasured (my estimate: 3-4 minutes).
- Not run on GitHub when this was written: the proof is the run of this PR; see the PR description.
