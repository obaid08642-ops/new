# Nabd+ Device & Layout Standard (all apps)

Applies to: patient-app, provider-app (React Native/Expo), patient-web, admin (Next.js), public pages. Binding for every new or changed screen. Visual tokens come only from `@nabd/design-tokens`.

## 0. Current state (measured on main, 2026-10-04)
- patient-app: safe-area handled per screen in 185 of 312 `.tsx` files; no shared screen wrapper. `app/room/[id].tsx` uses iOS-only `SafeAreaView` from `react-native`.
- provider-app: 97 of 145 files; same pattern.
- patient-web: `env(safe-area-inset-*)` only in `globals.css` and the mobile bottom nav.
- admin: no safe-area or mobile handling.
→ Fix centrally (below), then migrate screens; do not patch screen by screen.

## 1. Central shells (build once, use everywhere)
**Native — `packages/ui-native`:**
- `<Screen>`: `react-native-safe-area-context` insets (never RN's `SafeAreaView`). Props: `edges`, `scroll`, `keyboard` (`KeyboardAvoidingView` with iOS `padding` / Android `height`, plus `keyboardShouldPersistTaps="handled"`), `header`, `footer` (sticky, adds the bottom inset), `background` (canvas token).
- `<AppHeader>`: 44 pt bar below the top inset (notch / Dynamic Island / Android status bar). Glass only when scrolled. Back icon mirrors in RTL.
- `<StickyFooter>`: CTA bar = content + max(bottom inset, 16).
- `<TabBar>`: height 56 + bottom inset; glass; 44×44 hit areas.
- Status bar style follows the theme (`expo-status-bar` auto). Android edge-to-edge with transparent system bars.

**Web — `packages/ui` (patient-web + admin):**
- `<AppShell>`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; header/footer padded with `env(safe-area-inset-*)`; use `100dvh`, never `100vh`. Mobile (<768): top bar + bottom tab bar. Tablet (768–1023): top bar + collapsible side rail. Desktop (≥1024): side nav or top nav, content max-width 1200 (admin: fluid, max 1600).
- `<StickyFooter>` with `padding-bottom: max(16px, env(safe-area-inset-bottom))`.
- Admin on phone: tables become cards; filters go into a bottom sheet; no horizontal page scroll (only inside an explicit table scroller).

## 2. Breakpoints and target devices
- Web widths to verify: 320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440, 1920, 2560.
- Native devices: iPhone SE (3rd gen), 13 mini, 15, 15 Pro (Dynamic Island), 15 Pro Max; iPad 10.9" and 12.9" in both orientations; Android small (360×640), medium (Pixel 7), large (S24 Ultra), a foldable (inner and outer screen), an Android tablet.
- OS support:
  - Apple: every iOS / iPadOS version the current Expo SDK supports (at least iOS 15), every iPhone size from SE to Pro Max, notch and Dynamic Island.
  - Android: every Android version the current Expo SDK supports (at least Android 8 / API 26), on Samsung, Xiaomi, Oppo and Pixel, with gesture or 3-button navigation, punch-hole cameras, foldables and tablets.
- **Huawei (no Google services, HarmonyOS / EMUI):**
  - The app must install and run without Google Play Services.
  - Hide Google sign-in when GMS is missing.
  - Push notifications go through HMS Push Kit, or the app falls back to in-app notifications.
  - Maps fall back to an open map tile provider (or Huawei Map Kit).
  - Never crash on a missing GMS API.
- Browsers: the latest 2 versions of Safari (iOS and macOS), Chrome, Samsung Internet, Firefox, Edge and Huawei Browser.

## 3. Rules every screen must pass
1. No horizontal scroll at any width; long Arabic/English names wrap (max 3 lines) or truncate with a full-text tooltip/accessibility label.
2. No content under the notch, Dynamic Island, status bar, home indicator or Android gesture bar.
3. Touch targets ≥ 44×44 (iOS) / 48×48 dp (Android); spacing ≥ 8 between targets.
4. Font scaling up to 200% (Dynamic Type / Android font scale / browser zoom) without clipping; never `allowFontScaling={false}` on body text.
5. Keyboard never hides the focused field or the primary button.
6. Full RTL (ar, ur) and LTR (en, hi, bn, tl): use start/end, never left/right; directional icons mirror.
7. Light and dark from tokens; the system theme is the default and the user can override it.
8. Orientation: phones portrait-first (landscape must not break); tablets and web support both.
9. Reduce Motion is respected (OS setting / `prefers-reduced-motion`).
10. Images use explicit aspect-ratio boxes, so there is no layout jump.

## 4. Who does what
- Design session: this standard + reference screens at 390 / 768 / 1440.
- Implementer agent: build §1 shells first (one PR per package), then migrate apps in this order: patient-app, patient-web, provider-app, admin. Each migrated screen uses the shell only — no local inset math.
- Reviewer session: automated gate — Playwright at all §2 web widths (overflow, 44 px targets, axe), plus a native smoke run (Maestro or Detox) on the iPhone SE, the 15 Pro, a small Android and a tablet. A screen fails if any §3 rule fails.

## 5. Lint gates (CI)
- RN: ban `SafeAreaView` imported from `react-native`; ban `Dimensions.get` for layout (use `useWindowDimensions`); ban `marginLeft/Right`, `paddingLeft/Right`, `left/right` in styles (use Start/End).
- Web: ban `100vh`; ban raw hex; ban `left:`/`right:`/`margin-left`/`padding-left` in CSS modules (use logical properties).
