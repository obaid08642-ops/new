/**
 * The nine illustrated icons, by name only. The geometry lives in ./illustrated.ts, which is loaded on demand
 * (issue #286). This list repeats ILLUSTRATED_ICONS of ./illustrated.ts because that file is also run by plain
 * Node (build-icons.mjs), where an extensionless import of this one cannot resolve; the test
 * `illustrated-names matches illustrated.ts` (patient-web/tests/design-system-icons.test.tsx) keeps them equal.
 */

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
