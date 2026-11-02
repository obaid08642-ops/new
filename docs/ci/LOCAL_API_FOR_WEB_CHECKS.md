# CI checks must not depend on production (proposal, lead reviewer 2026-11-02)

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

## Proposal

1. **A composite action** `.github/actions/local-api/action.yml`, extracted from the stack steps of `live-gate.yml` (mongo replica set, redis,
   moto, backend build, `seed_admin.js`, `start-backend.sh`, wait for `/api/v1/health/liveness`). Output: `api-base-url=http://127.0.0.1:8002/api/v1`.
   Not a mock: the same backend the gate tests, so a contract change shows up in these checks too.
2. **Use it in** `runtime-contrast`, `patient-web` build, `lighthouse`, `p15-web-browsers`; replace every `https://api.nabd.plus/api/v1` there with the
   action's output. `live-gate.yml` calls the same action, so there is one place to maintain.
3. **Seed what the pages need.** An empty database renders empty shells; the contrast and Lighthouse checks need a home page that has data. Reuse the
   idempotent seeds the gate already runs (`tools/live/seed_legal.py` for the policy pages) and add one `tools/live/seed_public_pages.py` that
   publishes a small fixed set (a few categories and products, a doctor, an article) through the admin API, never by writing the database directly.
4. **Keep one production smoke check on its own.** A scheduled (not required) workflow keeps the "production still renders" signal that these jobs gave by
   accident; it is allowed to be red during an outage and is not a merge gate. `uptime.yml` (#2407) already covers reachability.
5. **Rollout**: first `runtime-contrast` alone (it is the one that blocked merging), compare its result with the production-backed run on the same commit,
   then the other three.

## Decisions / risks to settle before building
- Cost: starting mongo+redis+backend adds about 3-4 minutes to each of the four jobs (the gate does it in a similar time); the backend build can be
  shared through the existing build cache.
- Data fidelity: rendered-page checks on a small seeded set can pass where a production-sized catalogue would not (long names, many items). Lighthouse
  scores will move; its budgets need re-baselining on the seeded data, once, in the same PR as the switch.
- Anything in these jobs that really needs production content (images on `cdn.nabd.plus`, for example) keeps working offline only if its absence is
  tolerated; the first run will say which.
- Not built or run yet: this PR is the proposal. I have not started the stack in these four jobs, so the three-to-four-minute estimate and the seed
  set are unmeasured.
