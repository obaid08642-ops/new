# Logo rule (owner decision, 2026-10-25, binding)

The Noon Dot (ن bowl and pulse dot) is never black. Only two forms exist:

1. `variant="brand"`: the coral bowl and dot (#FF4B55) on a light or dark page (light mode and dark mode alike).
2. `variant="onBrand"`: the white mark on a coral/red tile.

The old `text` and `ink` variants of `NabdMark` (web, `patient-web/components-next/nabd-mark.tsx`) and `NabdLogo` (app, `patient-app/src/components/NabdLogo.tsx`) were removed so black cannot come back.
Guards: `patient-web/tests/nabd-mark-never-black.test.tsx` and `patient-app/__tests__/nabd-logo-never-black.test.tsx` fail if a screen passes `variant="text"` or `"ink"`.

Raster/brand files (`packages/brand/src`): `splash-dark.svg` and `logo-mark-ink.svg` still draw the bowl off-white (#F5F5F7) on the dark background; they are not black, but the owner has not said whether the dark splash should be coral too (open question, see the PR).
