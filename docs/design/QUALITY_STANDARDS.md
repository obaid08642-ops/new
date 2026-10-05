# Quality standards (owner, 2026-10-05)

Every screen PR must pass these, with the **measured numbers** in the checklist in the PR description (template at the end). "Automated" means CI fails on it today; "measured" means the PR author runs the tool and pastes the number until CI covers it.

## 0. Identity (fixed)
Canvas `#F5F5F7` (plain, no patterns or decorative shapes), action `#D42A38`, brand coral `#FF4B55`, ink `#0B1B2B`, the Noon Dot logo (`canvas/Main.dc.html`), Readex Pro, and the boards' icons, buttons and cards. **Never** introduce a colour, logo variant, background pattern or shape that is not on a board; if something is missing, ask the owner first. Every PR description says **"Identity check: no new colours/logo/patterns"** and includes the token diff (`git diff origin/main -- packages/design-tokens/tokens.json`, or "no token change").

## 1. Images and assets
| Rule | How it is checked |
|---|---|
| Photos and illustrations ship as WebP (AVIF on web); PNG only for app icons, splash and store assets | review |
| No raster over 200 KB in the apps or `patient-web/public` | **automated**: `tools/design/no-large-raster.ts` (CI step "No raster asset over 200 KB"; also in `npm test` of design-tokens) |
| Unused assets and fonts are removed (target: `patient-app/assets/fonts/MaterialSymbolsRounded.ttf`, 1.7 MB, used by 28 files today, goes when the last screen moves to the shared icons) | review |
| Remote images go through the CDN at the displayed size, lazy-loaded, with a placeholder and a fixed aspect ratio | review; layout shift is measured (CLS) |

## 2. Performance budgets
Web (mobile, 4G), per route, **automated** by `lighthouse.yml` (`patient-web/.lighthouserc.json` and `.github/lighthouse-budget.json`):
- LCP < 2.5 s, CLS < 0.1, TBT ≤ 200 ms (the lab stand-in for INP < 200 ms; INP itself is **measured** in the field), Lighthouse Performance ≥ 90.
- First-load JS per route ≤ 170 KB gzip (the `script` budget), fonts subset and self-hosted.

App (**measured** per release, pasted in the PR): cold start < 2 s on a mid-range Android; lists virtualised (FlashList / FlatList); Hermes on; animations on the UI thread at 60 fps; images cached with `expo-image`; the app download size per release.

Data: API responses cached (stale-while-revalidate), long lists paginated, no re-fetch on every render.

## 3. Accessibility
axe / Lighthouse Accessibility ≥ 95 on web (**automated**, same Lighthouse job), a screen-reader label on every control, 44 px targets (DEVICE_STANDARD §3), dynamic type to 200%.

## 4. Security and privacy
Keep the CSP and the security headers (components never set a `style` attribute: `tests/design-system-components.test.tsx`, CSP block), no tokens in localStorage, no secrets in client code, no medical data in logs or analytics.

## 5. SEO (public web pages)
Title and description per locale, hreflang for the 6 languages, canonical URLs, JSON-LD (Product/Drug, Physician, MedicalOrganization), sitemap and robots, SSR.

## 6. Reliability
No new Sentry errors; loading, empty, error and offline states on every screen; no console errors (the DOM/console check used for Batch 0: `scripts` in the PR).

## PR checklist (paste into every screen PR, with numbers)
```
Identity check: no new colours/logo/patterns   (token diff: …)
- [ ] Assets: no raster > 200 KB (CI ✔); WebP/AVIF; unused removed: …
- [ ] Web, mobile 4G, each route: LCP … s (<2.5)  CLS … (<0.1)  TBT … ms (≤200)  Perf … (≥90)  A11y … (≥95)  JS … KB gz (≤170)
- [ ] App: cold start … s (<2)  download size … MB (before … → after …)  lists virtualised ✔  images via expo-image ✔
- [ ] 44 px targets ✔  labels on every control ✔  200% text ✔
- [ ] CSP intact ✔  no tokens in localStorage ✔  no secrets/medical data in logs ✔
- [ ] SEO (public pages): title/description/hreflang×6/canonical/JSON-LD/sitemap ✔
- [ ] loading / empty / error / offline states ✔   console errors: 0
```
