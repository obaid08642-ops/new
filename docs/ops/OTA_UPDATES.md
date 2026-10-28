# Over-the-air updates (EAS Update)

patient-app and provider-app use `expo-updates`: a change to JavaScript or assets reaches installed Android and iOS apps without a store release.

## What goes over the air, and what does not

| Over the air (EAS Update) | Needs a store build |
|---|---|
| Screens, logic, styles, translations (JS) | A new or upgraded native module (any `expo-*`/`react-native-*` package with native code) |
| Images, fonts and other assets bundled by Metro | Permissions, `app.json` native fields (icon, splash, intent filters, plugins) |
| Fixes to API calls, validation, navigation | An Expo SDK or React Native upgrade |

The runtime version policy is `fingerprint` (`runtimeVersion` in `app.json`): the fingerprint is computed from the native code, so an update is only offered to binaries built from the same native code. If the native code changes, the fingerprint changes and old binaries simply keep the last update that matches them; nobody receives JS that expects a native module they do not have.

## How the app behaves

`updates.checkAutomatically: ON_LOAD` and `fallbackToCacheTimeout: 0`: at launch the app starts from the update it already has (never waits for the network), downloads a newer one in the background, and runs it at the **next cold start**. There is no prompt and no UI text.

## How it is wired

- `app.json`: `runtimeVersion`, `updates`. `app.config.js` adds `updates.url = https://u.expo.dev/<EAS_PROJECT_ID>` and `extra.eas.projectId` from the environment. **Without `EAS_PROJECT_ID`, updates are switched off** (`updates.enabled=false`), so CI and local builds are unaffected.
- `eas.json`: build profile `production` -> channel `production`, `preview` -> channel `preview`.
- `.github/workflows/eas-update.yml`: on a push to `main` that touches `patient-app/**`, `provider-app/**` or `packages/ui*/**`, publishes `eas update --channel production --auto --non-interactive` for each app that changed. Manual run: Actions -> "EAS Update" -> choose the app and the channel. Without the `EXPO_TOKEN` secret or the `EAS_PROJECT_ID` variable the run ends with a notice and succeeds.
- Test: `patient-app/src/__tests__/ota-config.test.ts` (fingerprint policy, never blocks launch, channels, project id from the environment).

## What the owner must do once

1. Create an Expo account and a project for each app (`eas init` in `patient-app/` and `provider-app/`, or on expo.dev). Note the project id of each.
2. GitHub -> Settings -> Secrets and variables -> Actions: add the secret `EXPO_TOKEN` (an Expo access token) and the variable `EAS_PROJECT_ID`. The two apps are two Expo projects, so if they differ, set the variable per app (an environment or a per-app variable) before relying on the provider app's updates.
3. Make a store build with `EAS_PROJECT_ID` set (`eas build --profile production`). **The first store build must include expo-updates**: apps already in the stores today do not have it and cannot receive over-the-air updates until they are updated once through the store.

## Roll back

Each publish is an update group. To undo a bad one, republish the previous good group to the same channel:

```
cd patient-app
npx eas-cli update:list --branch production          # find the previous group id
npx eas-cli update:republish --group <previous-group-id> --destination-channel production
```

Devices pick it up at their next launch and run it at the cold start after that. A bad update that breaks launch is also bounded by `expo-updates`' own recovery: if an update crashes on launch, the app falls back to the embedded bundle.
