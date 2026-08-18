# Provider Expo build blocker — 2026-08-18

## Evidence

The Provider snapshot at `/home/ubuntu/nabdah-live-work/provider-app` declares `main: node_modules/expo/AppEntry.js` in `package.json`, but the project root contains no `App.tsx`, `App.jsx`, or `App.js`. The source tree contains screens, context, components, API, and security modules, but no application entrypoint.

`npx expo export --platform android --output-dir=/tmp/nabdah-provider-export` fails before bundling with:

> Unable to resolve module `../../App` from `node_modules/expo/AppEntry.js`

## Classification

**BLOCKED_BUILD_SOURCE_SNAPSHOT**. This is not a runtime API failure and not fixed by changing Expo configuration. Creating a guessed App entrypoint would risk discarding the authoritative navigation/auth wiring and is therefore prohibited until the missing entrypoint is restored from the authoritative Provider source snapshot or supplied by the maintainer.

## Required next action

Restore the real Provider `App` entrypoint and navigation graph from the authoritative source register, then run TypeScript, Jest, Expo export/prebuild, and device/farm tests. No store-readiness claim is valid while this blocker remains.
