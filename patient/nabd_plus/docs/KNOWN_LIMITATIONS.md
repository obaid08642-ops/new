# Known Limitations & Technical Debt

This document tracks current technical constraints, missing implementations, and tech debt that must be addressed in future phases.

## Current Technical Limitations

1. **Design System:** Not all existing legacy screens have been migrated to use `src/design-system` components.
2. **HttpClient:** Does not currently handle WebSockets (planned for Phase 1B/Chat).
3. **Analytics:** Currently uses a `ConsoleProvider` stub. Real providers (e.g., PostHog/Firebase) will be integrated in Phase 3.
4. **FeatureFlags:** Remote fetching is not yet wired up to a backend; currently relies on static defaults.
5. **ThemeEngine:** Dynamic font overrides currently require an app restart to load the custom font assets properly.
6. **OTPInput Component:** On Android, pasting requires `maxLength: 2` workaround due to RN text input issues.
7. **BottomSheet Component:** Currently only supports a single height (no multi-snap points yet).
8. **Legacy UI:** The existing `ui.tsx` file has not yet been migrated to the new DS components.
9. **Imports:** Existing screens have not yet been fully migrated to use `@/` path aliases.

## Architecture Constraints

1. **Expo Managed Workflow:** Limits our ability to add native modules that do not have Expo config plugins without converting to bare workflow or creating custom dev clients.
2. **Code Splitting:** React Native does not support web-style code splitting. Bundle size must be managed through other means (e.g., dynamic imports for heavy JS libraries only, optimizing assets).
3. **Redux Persist:** Serialization/deserialization may become slow for large state trees (consider moving large collections to SQLite/AsyncStorage via Repository pattern).

## Known Tech Debt

1. **Root Directory Clutter:** There are 100+ Python automation scripts in the project root that need cleanup or movement to a `scripts/` directory.
2. **Build Outputs:** `tsc_output_*.txt` files should be removed from the root directory.
3. **Large Files:** `i18n_extraction.json` (2MB) resides in the root directory and should be moved to a `data/` or `assets/` directory to avoid clutter.
