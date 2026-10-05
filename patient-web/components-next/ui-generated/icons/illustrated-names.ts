/**
 * The nine illustrated icons, by name only. The geometry lives in ./illustrated.ts, which is loaded on demand
 * (issue #286). This list repeats ILLUSTRATED_ICONS of ./illustrated.ts because that file is also run by plain
 * Node (build-icons.mjs), where an extensionless import of this one cannot resolve; the test
 * `illustrated-names matches illustrated.ts` (patient-web/tests/design-system-icons.test.tsx) keeps them equal.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/illustrated-names.ts by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.

/** The service tiles on the home screen, in the order the canvas lists them. */
export const ILLUSTRATED_ICONS = [
  'pharmacy',
  'consult',
  'lab',
  'radiology',
  'nursing',
  'mind',
  'nutrition',
  'family',
  'doctor',
] as const;

export type IllustratedIcon = (typeof ILLUSTRATED_ICONS)[number];
