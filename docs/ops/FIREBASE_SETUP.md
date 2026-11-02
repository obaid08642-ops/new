# Firebase for the app builds (names only, never values)

Push needs three separate things. Only the first two are files in a build; the third lives on the server.

| What | Where it comes from | Where it goes |
|---|---|---|
| 1. The four Firebase app files | Firebase console > Project settings > Your apps | EAS file variables (below) |
| 2. The APNs key for iOS alerts sent through Firebase | developer.apple.com > Keys (APNs) | Uploaded in the Firebase console (below) |
| 3. Server credentials | Firebase service account, the same APNs key | The server `.env` (see `docs/ops/PUSH_KEYS.md`) |

The server already has the FCM service account (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`): the backend sees them. What the
server does not have, and must not have, is `google-services.json` or `GoogleService-Info.plist`: those belong to the **app build**, not
to the server.

## 1. The four files, as EAS file variables

| App | Bundle / package | Android file | iOS file |
|---|---|---|---|
| Patient | `com.patient.nabd` | `google-services.json` | `GoogleService-Info.plist` |
| Provider | `com.nabd.provider` | `google-services.json` | `GoogleService-Info.plist` |

Each is a different file per app (a Firebase "app" is one bundle id), so the four files are four different files. In Firebase console >
Project settings > Your apps, register the Android and the iOS app of each project and download its file.

Upload them to EAS as **file** environment variables, in the project of each app:

| Variable | Holds |
|---|---|
| `GOOGLE_SERVICES_JSON` | that app's `google-services.json` |
| `GOOGLE_SERVICE_INFO_PLIST` | that app's `GoogleService-Info.plist` |

`eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json` (and the same for the plist), once per app project
and environment (production, preview). EAS writes the file on the build machine and sets the variable to its path.

Both apps read the same two names in `app.config.js` (`patient-app/app.config.js`, `provider-app/app.config.js`): the variable if set, else
`./google-services.json` / `./GoogleService-Info.plist` next to the config. The file is added to the config only if it exists, so a build
without it (CI, local) still works and simply cannot receive remote push. The files are git-ignored (`.gitignore`, both apps) and CI refuses a
commit that contains one (`patient-production-ci.yml`).

## 2. The APNs key in the Firebase console (iOS)

Firebase delivers iOS alerts to APNs on the app's behalf, so it needs the APNs key. Firebase console > Project settings > Cloud Messaging >
Apple app configuration > APNs authentication key > Upload: the `.p8` file, its Key ID and the Team ID. Do it for both iOS apps.
One APNs key (created once under Keys in the Apple developer account) serves every app of the team.

## 3. What the server still needs for VoIP / call ring (names only)

Firebase cannot ring a locked iPhone: a call ring is a VoIP push, sent by the server straight to APNs (`push.module.ts`, topic
`<bundle id>.voip`). That path uses these server variables and nothing from Firebase:

| Name | What |
|---|---|
| `APNS_KEY_ID` | Key ID of the APNs key |
| `APNS_TEAM_ID` | Apple Team ID (same value as `APPLE_TEAM_ID` for app links) |
| `APNS_AUTH_KEY` | contents of the `.p8` file, newlines written `\n` |
| `APNS_BUNDLE_ID` (or `APNS_TOPIC`) | the app's bundle id; VoIP goes to `<id>.voip` |
| `APNS_HOST` | optional, only to use the sandbox host |

The server reads one bundle id, so the second app (the provider app, `com.nabd.provider`) is not covered by it yet: that is a code gap,
listed in `docs/qa/push-calls-matrix.md`, not a key to add.

Check the server side with ops task `97-push-keys-check.sh` (prints `OK` or `MISSING` per name, never a value). The build side has no
check beyond the build itself: after a build with the files, the app registers a device token and the push matrix cells turn PASS.
