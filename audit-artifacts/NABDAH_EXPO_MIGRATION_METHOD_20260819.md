# Expo SDK migration method

The Patient and Provider dependency findings require a major Expo SDK migration. The migration will therefore be performed **incrementally**, per application and in isolated working copies. It will use the controlled order documented by Expo: install the target SDK, align package versions with `expo install --fix`, run `expo-doctor`, then review native-project changes and release notes before accepting the result.[1]

| Step | Required control |
|---|---|
| SDK selection | Move one SDK major at a time; do not jump across unverified lines. |
| Dependency alignment | Use Expo’s compatibility resolver rather than arbitrary version pins. |
| Diagnostics | Capture `expo-doctor`, typecheck, test and web export results. |
| Native changes | Treat iOS/Android prebuild changes as device/build evidence, not as a web-only pass. |
| Acceptance | Rebuild the archive only after clean install and all available source gates pass. |

This method does not close real-device, store, EAS, Apple, Android or Firebase-device-farm prerequisites. It only defines the safe source-migration workflow.

## References

[1]: [Expo Documentation — Upgrade Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) "Official incremental SDK upgrade, dependency alignment and native-project guidance"
