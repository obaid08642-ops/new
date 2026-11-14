# R18 — real-user monitoring, synthetic journeys, status page, runbooks

Most of R18 already existed; this records what is where and what R18 changed.

| Requirement | Where | R18 change |
|---|---|---|
| Web vitals (LCP, INP, CLS, FCP, TTFB per page type, locale) | `backend/src/modules/rum`, `patient-web/lib/perf`; p75 vs budgets in the admin summary | none |
| App startup and crashes | `@sentry/react-native` in patient-app and provider-app: crash-free sessions per release (`enableAutoSessionTracking`), app-start and frame data from traces | patient-app traced 100 % of sessions in production; now 10 % (same as provider-app), 100 % in development |
| Synthetic journeys from outside | Cloudflare edge, `deploy/cloudflare/status-worker/journeys.mjs`: home, search, product, login, cart (no payment), doctors; alert when a journey fails twice in a row | cadence 10 → 5 minutes (cron `2-59/5 * * * *`, offset so it never shares a tick with the probes cron); the "fails twice" alert now fires after 10 minutes instead of 20; KV writes 864 of 1000 a day |
| Public status page | `status.nabd.plus` (`docs/ops/status-page.md`) | docs updated for the new cadence |
| Runbooks | `docs/runbooks` | new: `overload.md` (R16), `sign-in.md`, `calls.md`, `app-release-health.md`, `incident-checklist.md`, `README.md` index |
| Alerts | `ops/prometheus/nabd-alerts.yml` | new `OverloadStrained` and `OverloadShedding` (R16 gauge); a test now checks every `runbook_url` file exists and that every metric used is emitted |

## Honest limits
- Mobile screens are not probed from outside: the synthetic journeys prove the server side of each step. App-side health is Sentry release health, which needs the Sentry alert rules (crash-free under 99.5 %) created in the Sentry UI; they cannot be set from the repository.
- No custom app-start metric of our own: app start comes from the Sentry SDK at 10 % sampling, which is statistically thin for a small user base. If the first weeks show too few samples, raise the rate for the app-start span only.
- KV free plan: 136 writes a day of room left; another vantage or a faster cadence needs the history in D1.
- The sign-in and calls runbooks describe the checks that exist in the repository; they have not been exercised in a drill.
