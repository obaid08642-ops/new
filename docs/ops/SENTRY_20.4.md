# Errors with releases and source maps (P20.4)

Plan 20.4: "Sentry for the backend, web and both apps, with releases and source maps. Verify: a test error is
visible with its stack and release." Organisation `nabdplus` (region de.sentry.io), projects `nabd-backend`,
`patient-web`, `patient-app`, `provider-app`.

## What was wrong (2026-10-16)
- No event carried a release: no project could say which deploy an error came from.
- **No browser error ever reached Sentry.** With Turbopack, Next loads only `instrumentation-client.ts` in the
  browser; `sentry.client.config.ts` was never bundled (0 Sentry code in `.next/static`), and the CSP's `connect-src`
  did not allow the ingest host anyway. `NEXT_PUBLIC_SENTRY_DSN` was only set at run time in compose, which reaches
  the server, never the browser bundle.
- Backend stacks pointed at `dist/*.js`.

## What each part does now
| Part | Release | Stack |
|---|---|---|
| backend + worker | `SENTRY_RELEASE` (build arg of `Dockerfile.backend` = the git SHA) in `instrument.ts` | `node --enable-source-maps`: frames name `src/*.ts` lines (tsc writes the maps) |
| patient-web, server | `withSentryConfig({ release })` from `SENTRY_RELEASE` (build arg) | source maps uploaded when the build has `SENTRY_AUTH_TOKEN` (BuildKit secret), then deleted from the image |
| patient-web, browser | same, injected into the bundle | same; `instrumentation-client.ts`; the DSN inlined at build time; CSP allows the DSN's ingest origin only |
| patient-app, provider-app | the SDK's own `bundleId@version+build` | the `@sentry/react-native` Expo plugin (org/project/url) uploads maps in EAS builds when `SENTRY_AUTH_TOKEN` is an EAS secret; Metro adds debug ids (`getSentryExpoConfig`) |

`onRequestError` (server components, route handlers) and `onRouterTransitionStart` are wired too.

## Proof (2026-10-16, release `p20.4-verify-50dcc5d4`)
- Backend: `NABD-BACKEND-1Q`, release `p20.4-verify-50dcc5d4`, frame `escapeRegex` at `src/common/slug.util.ts:56`
  (the TypeScript line, from `node --enable-source-maps` over the compiled `dist`).
- Browser: `PATIENT-WEB-3`, release `p20.4-verify-50dcc5d4`, HeadlessChrome on `/:locale/privacy`, from the production
  build behind `server/nonce-server.mjs` with the production CSP (no violation; Sentry answered 200).
Both test issues were resolved after the check.

## Owner and reviewer steps (not in this PR)
1. **Release build** (`tools/ops/release/build-release.sh` on `review/server-inspect`): pass the SHA to both images:
   `--build-arg SENTRY_RELEASE=$SHA` for `Dockerfile.backend` and `Dockerfile.patient-web`.
2. **Source maps for the web**: a Sentry auth token with `project:releases` + `org:read` as GitHub secret
   `SENTRY_AUTH_TOKEN`, given to the web image build as a BuildKit secret:
   `SENTRY_AUTH_TOKEN=... docker build --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN ...`. Without it the build
   still works and uploads nothing.
3. **Apps**: the same token as an EAS secret (`eas secret:create --name SENTRY_AUTH_TOKEN`); the next store builds
   upload their maps. The provider app gets the Sentry native plugin, so it needs a new native build.

## Note found while doing this
Production's backend sent ~1,000 errors every 5 minutes from 07:00 UTC on 2026-10-16 (Redis "MISCONF … No space
left on device", MongoDB "ENOTFOUND mongodb": the root disk was full); Sentry's spike protection dropped most of
them. Alerting on that (20.5) is the next item.
