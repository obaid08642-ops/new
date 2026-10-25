# Mobile apps cleanup before the final deploy (2026-10-25)

Method: `knip` for candidates, then every file checked against the whole app (imports by name, platform variants `.native`/`.web`,
directory `index` imports, configs, scripts) and against `tools/` and the workflows. knip does not know the Expo entry points, so it
lists many live screens; only files with no importer anywhere are removed.

- **patient-app, 47 files:** an unused Redux layer from the first build (18 slices, selectors, helpers, a store test util), an unused
  clean-architecture scaffold (`core/domain` dtos/mappers/pagination/specifications, `core/platform` auth/id/integration/time,
  repository coordinator, users repository, conflict resolver, database and sync loggers, a secure DB proxy), `data/mockData.js`, and
  dead components and hooks (AnimatedScreen, BodyMap3D, CategoryVectorIcons, ScreenStates, animations, livekit-view, useBiometricAuth,
  useOfflineData, useTheme, ThemeEngine, chatSecurity, seo).
- **provider-app, 5 files:** `polyfills.ts`, `services/NotificationService.ts`, `types/FacilityTypes.ts`, `utils/strings.ts`.
- **Kept:** `constants/palette.generated.ts` (written by `tools/design/sync-client-tokens.mjs`). `DoctorOpsScreens.tsx` and
  `DoctorHeader.tsx` have no importer, but the doctor leave-request flow they hold is a real feature: a gap to wire (Needs review),
  not deleted here.
- Design gates lowered (never raised): no-raw-color 1229 → 1156, client-token-sync 675 → 613, no-literal-ui-string 178 → 164.
- `icon-glyphs.test.ts`: the last two files with literal MaterialCommunityIcons names were among the dead ones, so the floor of the
  name scan goes to 0; the check that every literal name resolves stays.

Checks: provider-app `tsc` 0, jest 38 suites / 236 tests passed; patient-app `tsc` 0, jest 177 suites / 1700 tests passed.
