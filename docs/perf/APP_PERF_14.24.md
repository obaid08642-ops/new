# 14.24 App performance: where each part stands

| Bullet | State | Where |
|---|---|---|
| New Architecture + Hermes | on (defaults) | Expo SDK 57 / React Native 0.86: the New Architecture is the only one and Hermes the engine; `app.json` turns neither off |
| FlashList v2 for long lists | **this PR**: orders, doctor search, notifications | `@shopify/flash-list` 2.0.2 (the version Expo 57 pins). The pharmacy catalogue grid stays a FlatList for now: it uses `numColumns` with `columnWrapperStyle` gaps and a centred 720 px column, which FlashList lays out differently; converting it needs a visual check against its board (follow-up) |
| `expo-image` with memory/disk cache and placeholders | **this PR**: the last 8 screens that used React Native's `Image` (clinic, doctor, articles, maternity weeks, diagnostics, insurance upload, offers, nursing) now use `expo-image` with `cachePolicy="memory-disk"`; product pictures already did (`ProductImage`, `transition`) |
| Persisted query cache, prefetch of the next screen's data | not done | the app has no query library (screens call `apiFetch`); adding a persisted cache is a data-layer change per screen, not part of this PR |
| Memoized selectors | as is | contexts and lists already memoise their rows (`useMemo`/`useCallback` in the list screens) |
| Bundle size tracked | **this PR** | `scripts/bundle-size.mjs` exports the Android bundle (Hermes bytecode) in CI and fails above `perf/bundle-budget.json` (measured 20,889,901 bytes on 2026-10-16, budget +2%; only goes down) |
| Cold start ≤ 2 s, 60 fps, memory < 300 MB on a low-end Android; a report per release | **BLOCKED** | needs a real low-end device or the device farm: `.github/workflows/device-farm.yml` stops at "BLOCKED" without `GCP_SA_KEY` / `GCLOUD_PROJECT` / `RESULTS_BUCKET` and an EAS-built APK. The owner provides the account or a device |
