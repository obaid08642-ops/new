/**
 * Web screen shells — DEVICE_STANDARD §1. Import ./shells.css once in the app.
 * Web-only layout, so not part of the cross-platform component contract.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/shells/index.ts by tools/design/sync-ui-components.mjs.
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
export { AppShell, type AppShellProps } from './AppShell';
export { StickyFooter, type StickyFooterProps } from './StickyFooter';
