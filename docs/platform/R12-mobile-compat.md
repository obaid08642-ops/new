# R12 - Mobile compatibility: old builds in the stores keep working (2026-11-03)

## What already existed (verified end to end by reading both sides)
- Admin sets `app_versions.apps.{patient|provider|driver|pharmacy|web}.{min_version, latest_version, maintenance, message_ar, message_en}`: `PUT /admin/app-versions` (permission `settings.edit`, audited), editor in `admin/src/pages/admin/config-portal.tsx`.
- `GET /config` returns it (fail-open when the store is down: `config.service.ts`).
- Patient and provider apps have an `AppGate` that reads `/config` at start and shows the update or maintenance screen when the build is below `min_version` (`isVersionBlocked`, unit-tested in both apps).
So the force-update SCREEN works for builds that contain the gate. What was missing: (1) nothing on the server side, so a build without the gate, an old gate, or a bypassed client kept calling the API; (2) the apps did not tell the server which build they are (patient: no header at all; provider: a hard-coded `'X-App-Version': '1.0.0'` that never changed); (3) no check that a backend change does not break builds in the stores; (4) no written support policy.

## 1. The apps say who they are
Patient and provider apps now send `X-App-Id` and `X-App-Version` with every request. The version is read from `app.json` (the stamp of the store build), not from a constant: `patient-app/src/utils/appVersion.ts` (used by the axios client, `apiFetch` and `AppGate`) and `provider-app/src/utils/appVersion.ts` (used by `buildHeaders`). Driver and pharmacy apps are not in this repository; their ids are accepted by the server when they send the headers.

## 2. The server enforces the minimum (`common/app-version.middleware.ts`)
A request with a known `X-App-Id` and an `X-App-Version` below that app's `min_version` gets **HTTP 426** `{error: 'app_update_required', min_version, latest_version, message_ar, message_en}` on every route except `config`, `health`, `observability` and `.well-known`. Config read every 30 s, fail-open (a broken config store never locks users out; the last good copy is used). **Not enforced**: requests without the headers (builds released before this change, scripts, web), so the old builds that exist today cannot be stopped by the server; they can only be retired by removing an endpoint they call, which is why section 3 exists. The apps' `AppGate` should treat a 426 like a failed version check (it already blocks on `/config`); a build that does not know 426 will show its normal error for failed calls.
Traffic per build is counted: `nabd_client_requests_total{app,version}` (max 60 series, odd versions as `other`), so "who still uses 1.0.0" is a query, not a guess.

## 3. Contract tests for the previous builds (`contracts/released-clients`, `legacy-client-contract` workflow)
`tools/ci/freeze-client-contract.sh <app> <version>` freezes every write call (URL + body keys) of an app at the release commit into `contracts/released-clients/<app>-<version>.json`. The workflow runs `tools/audit/dtocheck.js` (whitelist + `forbidNonWhitelisted` + required fields + types) of the CURRENT backend DTOs against every frozen file; a call that would get HTTP 400 fails the PR. It has a negative control step (a doctored contract must fail) so the check cannot silently pass. Today's files: `patient-app-1.0.0.json` (154 calls, 89 matched to DTO routes, 0 mismatches) and `provider-app-1.0.0.json` (218 calls, 142 matched, 0 mismatches), frozen from `main` as of this PR **on the assumption that 1.0.0 is what the stores hold**; both apps' `app.json` say 1.0.0 and I cannot see the store consoles. If a store build differs, re-freeze from its release commit.
Limits, stated: request bodies only (a renamed or removed RESPONSE field is not caught: the next step is a response-shape snapshot per released version, built from the same release freeze), query strings and path params are not part of the contract, and calls whose body cannot be resolved statically are listed by dtocheck as "verify by hand".

## 4. Deprecation policy (proposal for the owner)
1. **Support window**: the current store version and the previous one, and in any case 6 months after a newer version is released. A version outside the window is retired by raising `min_version`.
2. **Soft first**: set `latest_version` (the app may show a dismissible prompt), at least 14 days before the forced step.
3. **Forced step**: raise `min_version`; the server answers 426 with the admin's AR/EN message. Never on a Friday evening or during Hajj/Ramadan peaks; the admin edit is audited.
4. **Breaking an endpoint** that a supported version calls is not allowed (expand/contract, `docs/platform/R4`); to remove it: check `nabd_client_requests_total` for the versions that call it, raise `min_version` above them, wait one release cycle, then remove it and delete the frozen contracts below `min_version`.
5. Every store release: run the freeze script, commit the file with the release, bump `app.json` (the header follows).
6. Emergency (a security hole in an old build): raise `min_version` at once; the 426 does the rest for builds that send the header.

## Not done
- The driver and pharmacy apps (not in this repo).
- Response-shape contracts, per-endpoint `Sunset` headers.
- A 426-aware screen in the apps beyond the existing gate (the gate already blocks on `/config`; a 426 mid-session is shown as an error until the next start).
- The admin editor does not yet show traffic per version next to the minimum (the metric exists; a dashboard panel is the cheap way).
