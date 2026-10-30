# App links: how a Nabd web link opens the app

One list drives everything: `patient-web/lib/app-links.ts` (`PUBLIC_APP_LINK_PATHS`: each path bare and under the six locales).

| Piece | Where | Kept equal to the list by |
|---|---|---|
| iOS universal links | `/.well-known/apple-app-site-association` (patient-web route; nginx serves `deploy/nginx/well-known/apple-app-site-association`) | `patient-web/app/.well-known/apple-app-site-association/route.test.ts`, `patient-web/tests/app-links-static.test.ts` |
| Android app links | `patient-app/app.json` `intentFilters` (4 hosts), `/.well-known/assetlinks.json` | `patient-app/src/__tests__/native-intent.test.ts`, `patient-web/tests/app-links-static.test.ts` |
| Link -> screen | `patient-app/src/navigation/webLinkMap.ts` (expo-router `+native-intent`) | `native-intent.test.ts`: every listed pattern maps to a route file that exists |
| App not installed | nothing to do: a universal link / app link is an ordinary https URL, so the browser opens the web page | |

## IDs
- iOS appID = `<Team ID>.<bundle id>`: Team ID `6AT2W85DBC` (`APNS_TEAM_ID` and `APPLE_TEAM_ID` in `deploy/.env.production.example`), patient bundle id `com.patient.nabd` (`patient-app/app.json` `ios.bundleIdentifier`), provider `com.nabd.provider`. (The nginx file used to say `com.nabd.patient`, which is not an app id, so no iPhone ever opened the app from a link.)
- Android package `com.patient.nabd` / `com.nabd.provider`.

## OWNER ACTION: Android signing fingerprint
`assetlinks.json` carries `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`, which is the **sample fingerprint from Google's documentation**, not the key of the app. With it Android cannot verify the links, so app links open the browser. The repo cannot know the real value: it is the SHA-256 of the **app signing key certificate** in Play Console (Setup > App signing). The owner pastes it in `ANDROID_SHA256_FINGERPRINT` (patient-web env, `deploy/.env.production.example`) and in `deploy/nginx/well-known/assetlinks.json` (comma-separated for more than one key, e.g. the upload key for internal testing); the test keeps the two files equal.

## Regenerating the static files
`deploy/nginx/well-known/*` are what production serves (nginx answers before Next). After changing the list, regenerate them from the routes (the test fails when they differ):
`cd patient-web && npx tsx <script that writes JSON.stringify(await GET().json(), null, 2) of both routes>`; the files are the routes' output, 2-space JSON.
