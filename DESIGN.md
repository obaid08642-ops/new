---
name: Nabd+
description: Calm, premium healthcare. An Apple-like neutral off-white ground, deep ink for text, one warm coral for brand and action, acid lime as a small accent on dark only. Readex Pro. Soft depth, restrained glass, purposeful motion.

# Mirrors packages/design-tokens/tokens.json (the source of truth). If a token changes there, update this file.
colors:
  brand-coral: "#FF4B55"        # logo, large display, brand highlights. NEVER white text on it (3.29:1)
  action-primary: "#D42A38"     # primary buttons, light theme; white label (5.01:1)
  action-primary-dark: "#FF6B73" # primary buttons, dark theme; ink label
  ink: "#0B1B2B"                # primary text (light), dark canvas
  canvas: "#F5F5F7"             # light page ground (neutral off-white; no beige, never pure white)
  surface: "#FFFFFF"            # cards on light
  surface-dark: "#12263A"       # cards on dark
  elevated-dark: "#1A3148"      # sheets and menus on dark
  border: "#E5E5EA"
  text-secondary: "#6E6E73"     # 4.66:1 on canvas
  text-secondary-dark: "#9AA4B2"
  lime: "#D7FF00"               # DARK SURFACES ONLY; ink label (15.1:1); never on light; never next to coral fills
  success: "#1F7A5C"
  warning-text: "#8A5A00"
  warning-bg: "#FFF4D6"
  info: "#3A56D4"
typography:
  family: "'Readex Pro' with per-locale Noto fallbacks (Arabic, Nastaliq Urdu, Devanagari, Bengali)"
  scale: "display 40 · h1 32 · h2 24 · h3 20 · body-lg 17 · body 15 · caption 13 · label 13–14; Arabic line-height 1.6–1.7"
radius: { sm: 8, md: 12, lg: 16, xl: 20, 2xl: 24, 3xl: 28, pill: 9999 }
space: [4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]
---

# Design System: Nabd+

## 1. Overview
A quiet, trustworthy ground (neutral off-white #F5F5F7, deep ink #0B1B2B) with one warm voice (coral) for brand and action. Premium comes from precision, consistent spacing, soft depth and restraint, not from decoration. The approved screens in `docs/design/canvas/` (Home, HomeDark, Product, Checkout, Booking, Doctor, Success, WebHome, System) are the visual contract. **These decisions override any generic default or anti-pattern rule from a design tool.**

## 2. Colors
- Use semantic tokens only; no raw hex in components (lint `no-raw-color`).
- Primary button: #D42A38 with a white label (light) / #FF6B73 with an ink label (dark).
- Coral #FF4B55 is for the logo, large display text and highlights, never behind small white text.
- Acid lime #D7FF00 is a small accent on dark surfaces only: dark primary CTA, the active tab on a dark bar, "new" badges. The label on lime is always ink.
- Each service has a soft tint used only behind its icon: pharmacy coral-50, consultations blue-50, lab mint-50, radiology violet-50, nursing amber-50, mental health lavender-50, nutrition lime-50, family peach-50.
- Contrast: 4.5:1 for text, 3:1 for icons and large text, in both themes (CI `contrast-check`).

## 3. Typography
Readex Pro for Arabic and Latin; Noto fallbacks per locale. Use the type-scale tokens only, with no px sizes in components. Arabic needs a generous line height. Numbers use the locale's digits where the copy does.

## 4. Elevation and Material
- Cards: white on canvas, radius 20–24, shadow `0 8px 24px rgba(11,27,43,0.07)`; on dark, #12263A with a hairline border.
- Liquid glass ONLY on: the bottom tab bar, the app bar when scrolled, bottom sheets and modals, and the floating buy/checkout bar. Never behind body text or on list cards. Keep a scrim so text stays at 4.5:1.

## 5. Icons and Illustration (owner decision)
- **Service and category icons:** the "soft glass" style (B): layered shapes with a gentle gradient, a white glossy edge and a soft coloured shadow, on white tiles (radius 24). The set of record is `docs/design/canvas/IconStyled.dc.html` (variant `glass`). **Service icon tiles are approved; do not remove them.**
- **Illustrations** (onboarding, empty states, errors, success): the outlined style (A) from `docs/design/canvas/Icon.dc.html`: flat brand colours with a 2.2 px ink outline.
- **Small UI icons** (in buttons, lists, the tab bar): one line set (Phosphor regular) through the single `<Icon>` wrapper; `filled` for state (favourite, rating).
- **Zero emoji in the UI** (lint `no-emoji-in-ui`). Never draw new icons in screens; request them as `NEEDS_ASSET`.

## 6. Components
- **Buttons:** height 52–56, radius 16–18. The primary has a subtle top highlight and a soft coloured shadow, scales to 0.97 when pressed (with haptics on mobile), and goes from loading (spinner) to success (check). Secondary buttons are glass or outline; icon buttons are circular glass with an aria-label.
- **Segmented controls** for delivery/pickup and direct/insurance. Chips for status ("No prescription", "Needs prescription", "Accepts insurance", "Awaiting approval").
- **One-page checkout** and **one-screen booking** as in the canvas: sections with smart defaults and a sticky glass CTA bar.
- Every screen has loading (skeleton), empty (illustration plus one action), error (retry) and success states.

## 7. Motion
Staggered entrance, 40–60 ms apart, 180–240 ms ease-out, translateY 8 px with a fade; total ≤ 500 ms. Press feedback in 120 ms. The logo dot pulses at 60 bpm as the loader. The success celebration lasts ≤ 1.5 s. Animate transform and opacity only. Respect reduce-motion.

## 8. Layout and Responsiveness
Mobile-first, with breakpoints at 320/375/414/768/1024/1280/1440/1920/2560. No horizontal scroll. Safe areas, notch and Dynamic Island are handled. Tablets get two columns. Desktop gets a side nav and a max content width. Full RTL mirroring; icons with direction (back, next) mirror in RTL.

## 9. Do / Don't
- Do: real data, fewest steps, generous whitespace, one primary action per screen.
- Don't: beige or pure-white page grounds, white text on coral or lime, lime on light, emoji, invented ratings or counts, cards inside cards, gradient washes behind text.
