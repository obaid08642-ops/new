# App links: how a Nabd web link opens the app

One list drives everything: `patient-web/lib/app-links.ts` (`PUBLIC_APP_LINK_PATHS`: each path bare and under the six locales).

| Piece | Where | Kept equal to the list by |
|---|---|---|
| iOS universal links | `/.well-known/apple-app-site-association` (patient-web route only; no static copy, nginx passes it to Next) | `patient-web/app/.well-known/apple-app-site-association/route.test.ts`, `patient-web/tests/app-links-static.test.ts` |
| Android app links | `patient-app/app.json` `intentFilters` (4 hosts), `/.well-known/assetlinks.json` | `patient-app/src/__tests__/native-intent.test.ts`, `patient-web/tests/app-links-static.test.ts` |
| Link -> screen | `patient-app/src/navigation/webLinkMap.ts` (expo-router `+native-intent`) | `native-intent.test.ts`: every listed pattern maps to a route file that exists |
| App not installed | nothing to do: a universal link / app link is an ordinary https URL, so the browser opens the web page | |

## IDs
- iOS appID = `<Team ID>.<bundle id>`: Team ID `6AT2W85DBC` (`APNS_TEAM_ID` and `APPLE_TEAM_ID` in `deploy/.env.production.example`), patient bundle id `com.patient.nabd` (`patient-app/app.json` `ios.bundleIdentifier`), provider `com.nabd.provider`. (The nginx file used to say `com.nabd.patient`, which is not an app id, so no iPhone ever opened the app from a link.)
- Android package `com.patient.nabd` / `com.nabd.provider`.

## OWNER ACTION: the two values (names to set in the patient-web environment)
| Variable | What it is | Without it |
|---|---|---|
| `APPLE_TEAM_ID` | Apple Developer Team ID: 10 upper-case letters/digits (Apple Developer > Membership). Same value as `APNS_TEAM_ID`. | `/.well-known/apple-app-site-association` answers 503, `Cache-Control: no-store` |
| `ANDROID_SHA256_FINGERPRINT` | SHA-256 of the **app signing key certificate** in Play Console (Setup > App signing), `AA:BB:...` 32 bytes; comma-separated to add the upload key for internal testing. | `/.well-known/assetlinks.json` answers 503, `no-store` |

There is no default and no sample: a wrong value would make iOS/Android cache a failed verification and open every link in the browser, so the file is simply not served until the real value is set. Google's documentation sample fingerprint (`FA:C6:17:...`) and a malformed value are refused too. Optional (defaults are the apps' real ids): `APPLE_BUNDLE_ID`, `APPLE_PROVIDER_BUNDLE_ID`, `ANDROID_PACKAGE_NAME`, `ANDROID_PROVIDER_PACKAGE_NAME`. Both are passed to the container by `deploy/docker-compose.production.yml` (`APPLE_TEAM_ID`, `ANDROID_SHA256_FINGERPRINT` in `deploy/.env.production`).

Both files are served with `Content-Type: application/json` and no redirect (`proxy.ts` passes any path containing a dot straight through, so `/.well-known/...` is never sent to a locale prefix). The 3-D Secure return and e-mail links reopen the app only once both values are set and the hosts below serve the files.

## OWNER ACTION: hosts
`patient-app/app.json` claims `app.nabd.plus`, `nabd.plus`, `www.nabd.plus` and `app.nabdahplus.com`. In this repo's nginx only `nabd.plus` and `www.nabd.plus` are served by patient-web (`deploy/nginx/conf.d/nabd-web.conf`); there is no server block for `app.nabd.plus` or `app.nabdahplus.com`, so unless DNS/Cloudflare routes them to the same patient-web they answer no association file, and Android `autoVerify` fails for the whole filter on those hosts. Point both hosts at patient-web, or remove them from `app.json`.
