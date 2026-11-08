/** The icon sprite (see tools/design/sync-ui-components.mjs): <use href={fillHref(name)}> / <use href={lineHref(name)}>. The file name carries its hash. */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/fill.ts by tools/design/sync-ui-components.mjs.
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
export const ICON_SPRITE_URL = '/icons/sprite-2aa9f43b.svg';
export const fillHref = (name: string): string => `${ICON_SPRITE_URL}#f-${name}`;
export const lineHref = (name: string): string => `${ICON_SPRITE_URL}#l-${name}`;
