# Runbook: app crashes or slow start after a release

Sources (all existing): Sentry projects `patient-app` and `provider-app` (release health: crash-free sessions and users per release, app-start and slow/frozen frames in the 10 % traces), `nabd_client_requests_total{app,version}` from the API (R12), the web vitals summary (admin `GET /admin/rum/summary`, p75 LCP/INP/CLS per page type).

**Triggers to look:** crash-free sessions of the newest release under 99.5 % (compare with the previous release), crash-free users under 99 %, a new top issue with > 1 % of sessions, app-start p75 more than 20 % worse than the previous release, a support wave naming a version.

1. Sentry > Releases > the newest release: crash-free rate, new issues, adoption. Compare with the previous release at the same adoption age.
2. One issue dominating = read its stack (maps are uploaded by the EAS build, `docs/ops/SENTRY_20.4.md`). Is it one OS/device model?
3. **Stop the rollout:** pause the staged rollout in the store consoles; for an OTA update, republish the previous update (`eas-update.yml`) to the channel.
4. Force-upgrade gate: to push users OFF a bad version, raise `min_version` (`PUT /admin/app-versions`, audited; the server then answers 426); to hold users on a good version do the opposite. See `docs/platform/R12-mobile-compat.md`.
5. Web: a bad deploy shows as RUM p75 regression on the page type; roll the web image back (`api-availability.md` rollback steps).

**Verify:** crash-free sessions of the replacement release back above 99.5 % after 24 h of adoption.
