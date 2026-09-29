# `@nabd/brand` — the Nabd+ identity

Owner-approved **2026-09-29** (direction A, "Noon Dot"). The contract is
`docs/audit/05_OWNER_ADDITIONS_DESIGN_AND_GAPS.md` §A1 and the canvas in
`docs/design/canvas/`.

The mark is the open bowl of the Arabic letter ن — a holding hand — with the
pulse dot above it. In the app the dot beats at **60 bpm** on the splash, on
loading and on success (12.A9).

```
<path d="M40 104 C40 196 200 196 200 104" … stroke-width="36" …/>
<circle cx="120" cy="58" r="24" …/>
```

## The geometry is not negotiable

`src/logo-mark.svg` is the master. `node build.mjs` **fails the build** if any
other source stops using that exact path and circle, so the mark cannot drift
between the store listing, the favicon and the running app. Only the colours,
the scale and the background may vary.

`packages/brand` deliberately contains **no JavaScript**. The React wrappers
live with the apps that use them (`patient-web/components-next/nabd-mark.tsx`,
`patient-app/src/components/NabdLogo.tsx`) and are consolidated into
`packages/ui` in 12.A7, when the app-to-package wiring is introduced.

## Layout of this package

| Path | What it is |
|---|---|
| `src/logo-mark.svg` | **the master** — coral, on transparency |
| `src/logo-mark-ink.svg` | the dark lockup: off-white bowl, coral dot |
| `src/logo-mark-onbrand.svg` | the white mark, for a coral fill |
| `src/favicon.svg` | the bare mark, for the browser tab |
| `src/icon-ios.svg` | coral tile, white mark at 65% — square, **no radius** |
| `src/icon-maskable.svg` | coral tile, white mark at 52% — inside the 66% safe zone |
| `src/icon-square.svg` | rounded coral tile (23% radius) — web, PWA, Open Graph |
| `src/icon-android-background.svg` | adaptive background layer: a flat field |
| `src/icon-android-foreground.svg` | adaptive foreground: white mark at 55% |
| `src/notification-icon.svg` | white silhouette on transparency — Android masks it |
| `src/splash-light.svg`, `src/splash-dark.svg` | portrait 1242×2688, mark only |
| `dist/` | **generated** PNGs + `favicon.ico` (committed; `--check` guards drift) |

## Which file goes where

| Consumer | File |
|---|---|
| iOS / App Store | `dist/icon-1024.png` — opaque; the store rejects an alpha channel |
| Android launcher | `dist/icon-android-background-1024.png` + `dist/icon-android-foreground-1024.png` |
| Web, PWA manifest, Open Graph | `dist/icon-512.png`, `dist/icon-192.png`, `dist/icon-square.svg` |
| Apple touch icon | `dist/icon-180.png` |
| Browser tab | `dist/favicon.ico` (16/32/48) |
| Android notifications | `dist/notification-icon-1024.png` — flat white, no colour |
| Expo splash | `dist/splash-light-1242x2688.png` / `splash-dark-…` |

## Two rules the wordmark obeys

1. **The wordmark is text, never an asset.** "نبض" / "Nabd+" is rendered as real
   text next to the mark, so it uses Readex Pro, reaches screen readers and
   follows the active locale. Only the mark is baked into a raster.
2. **The wordmark stays beside the mark** in every first-exposure placement —
   store listing, site header, splash — so the mark reads as "Nabd" and not as
   the letter ن on its own.

## Building

```bash
node packages/brand/build.mjs            # write dist/
node packages/brand/build.mjs --check    # fail if dist/ drifted from src/
```

`sharp` is the only rasteriser and is resolved from the `admin` (or `backend`)
workspace, so this package adds no dependency to any client app.

## Note for the owner (not an agent task)

The name "Nabd / نبض" is already used by other health apps. The owner is running
an official SAIP trademark search with a lawyer before final registration. That
is a legal matter, not a code one, and it does not block anything here.
