# Push keys the owner must provide (names only)

Never paste a key into chat or a PR. Put it where this page says. Check afterwards with the ops task
`97-push-keys-check.sh` (prints `OK` or `MISSING` per name, never a value).

| # | Name | Where to get it | Where it goes |
|---|---|---|---|
| 1 | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | Firebase console > Project settings > Service accounts > Generate new private key (JSON). The three values are `project_id`, `client_email`, `private_key` in that file | Server env file `/opt/nabdah/deploy/.env` (keep the `\n` in the private key). A second project (`FCM_*_2`) is read for the other app |
| 2 | `google-services.json` | Firebase console > Project settings > Your apps > Android (one per app: patient, provider) | `patient-app/google-services.json`, `provider-app/google-services.json` (EAS file secret or the build machine; `app.json` points to `./google-services.json`) |
| 3 | `GoogleService-Info.plist` | Same place, iOS app | `patient-app/GoogleService-Info.plist`, `provider-app/GoogleService-Info.plist` |
| 4 | `APNS_AUTH_KEY` (the `.p8` file contents) and `APNS_KEY_ID` | developer.apple.com > Certificates, IDs & Profiles > Keys > create a key with "Apple Push Notifications service (APNs)". The Key ID is shown on the key page; the `.p8` downloads once only | Server `.env`: `APNS_AUTH_KEY` (newlines as `\n`), `APNS_KEY_ID` |
| 5 | `APNS_TEAM_ID` | developer.apple.com > Membership details | Server `.env`; the same value as `APPLE_TEAM_ID` for app links (#2281) |
| 6 | `APNS_BUNDLE_ID` / VoIP topic | The app's bundle id. The backend sends alerts to `<bundle id>` and VoIP to `<bundle id>.voip` (no separate key; the same `.p8` signs both) | Server `.env` `APNS_BUNDLE_ID` (see "Gaps" for the provider app's own bundle) |
| 7 | `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT` | Generated on the server by ops task `97b-vapid-generate.sh`: no key passes through chat. It refuses to overwrite an existing pair | Written to the server `.env` by the task; restart the backend |
| 8 | `EXPO_TOKEN` | expo.dev > Account settings > Access tokens | GitHub repository secret `EXPO_TOKEN` (needed for EAS builds and OTA) |

## Steps
1. Do 1, 4, 5, 6 on the server: edit `/opt/nabdah/deploy/.env`, restart the backend.
2. Run the ops tasks: `97b-vapid-generate.sh`, then `97-push-keys-check.sh`; every name should read `OK`.
3. Add 2 and 3 to the app builds (EAS file secrets) and rebuild both apps; push does not work in a build made without them.
4. Add 8 as a GitHub secret.

## Gaps that need a build or code, not a key
See `docs/qa/push-calls-matrix.md`: the iOS PushKit native module is not in `patient-app/package.json`, and the provider app has no native call-ring path.
