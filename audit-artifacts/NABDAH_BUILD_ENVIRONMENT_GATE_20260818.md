# Nabdah build environment gate — 2026-08-18

The authoritative direct source is present at `/home/ubuntu/nabdah-authoritative-worktree` on commit `21006cc`. All five application packages have lockfiles, but no local `node_modules` in the authoritative worktree.

The sandbox filesystem currently reports approximately **96% inode usage** (38,084 free inodes). Existing inode-heavy temporary QA/cache directories include `/tmp/nabdah-device-validation`, `/tmp/nabdah-appointment-work`, `/tmp/nabdah-backend-f2bffa2-gate`, `/tmp/jest_rs`, `/tmp/metro-cache`, and other generated caches. This prevents treating a fresh `npm ci` or complete clean build as a reliable gate until the environment is recovered.

Status: **BLOCKED — environment capacity**, not a source pass/fail. No project or database data was deleted. The next action is to archive or remove only known temporary QA/cache artifacts, then install from each lockfile and run the package-specific build/test commands. Any clean build result must identify the exact commit and package.

## Patient-specific recheck

A fresh isolated Patient copy was tested without touching the authoritative source. `npm ping` against `https://registry.npmjs.org/` passed. `npm ci` against the committed lockfile failed before installation because the lockfile is materially out of sync with `package.json` (multiple Expo/Sentry/lightningcss versions and missing Jest/Expo packages). Running `npm install --package-lock-only` in the temporary copy reconciled the lock metadata, but the resulting lock still contained injected tarball URLs under `https://npm.mirrors.msh.team/`, which failed with `ENOTFOUND` for `redux-persist`. Replacing only those temporary tarball hosts with `https://registry.npmjs.org/` made `npm ci --ignore-scripts --no-audit --no-fund` pass with 1,502 locked packages.

This proves two separate blockers: **(1)** the committed Patient lockfile requires a source-level reconciliation decision, and **(2)** the sandbox's package mirror injection is unreachable unless tarball URLs are normalized in the build environment. No lockfile was copied back or modified in the authoritative source, and no Patient build/typecheck/Jest result is claimed from this temporary install.

## Temporary Patient validation gate

After the isolated lock reconciliation and tarball-host normalization described above, the temporary Patient copy completed three real validation commands successfully: `npm run typecheck`, `npm test -- --runInBand`, and `npm run export:web`. Jest reported **7 passed suites and 23 passed tests** in 4.739 seconds. Expo export emitted web, Android Hermes, and iOS Hermes bundles; the web entry was 9.37 MB and Android/iOS bundles were 13.5 MB each. These results prove the reconciled dependency graph can typecheck, execute the current Jest suite, and bundle for Expo. They do **not** repair or replace the committed source lockfile, nor do they substitute for native device, backend integration, E2E, security, or production tests.

The same temporary copy also completed `npx expo prebuild --no-install --platform android` successfully. Generated native folders remain temporary and were not copied to source. Expo emitted one non-fatal configuration warning: `userInterfaceStyle` requires `expo-system-ui` to take effect. This is a release-configuration follow-up, not a prebuild failure.
