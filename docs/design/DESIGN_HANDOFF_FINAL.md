# Nabd+ — Final Design Handoff (patient app + patient web)

**This file and the boards in `nabd-design-boards.zip` are the ONLY design source.**
- There is no other reference file.
- `DESIGN.md` at the repo root still holds the brand basics. Where it conflicts with this file, this file wins.
- Device rules: `DEVICE_STANDARD.md`.
- Field mapping for product and doctor pages: `SPEC_PRODUCT_DOCTOR_DETAIL.md`.

## 0. How to read the boards
Each `*.dc.html` file is one screen mock-up written in HTML:
- Inline styles hold the exact sizes, radii, spacing and colours.
- `{{name}}` values come from the `renderVals()` script at the bottom of the file.
- `<sc-for>` is a repeated list and `<sc-if>` is a conditional block.
- `<dc-import name="FIcon">` is the icon component, defined in `FIcon.dc.html` with every icon path and tone. `PIcon` is the duotone variant.
- Text in `[brackets]` is a placeholder for real API data.
- Port each board to React (web) or React Native (app) **with tokens and shared components**. Never paste hex values into screens.

## 1. Locked decisions
- **Font:** Readex Pro, in all 6 languages (ar, en, ur, hi, bn, fil), with Noto fallbacks. Self-host the font so builds do not depend on Google Fonts.
- **Colours:**
  - Canvas `#F5F5F7` (light) / `#0B1B2B` (dark).
  - Cards `#FFFFFF` / `#12263A`.
  - Text `#0B1B2B` / `#F5F5F7`; secondary text `#6E6E73` / `#9AA4B2`.
  - Action `#D42A38` (a coral gradient on primary buttons, white label).
  - Brand coral `#FF4B55` for the logo and highlights.
  - **No dark cards in light mode.**
- **Icons:**
  - Service and action icons are Phosphor **fill** icons inside a soft-tinted rounded square (radius 32% of its size). Sizes: 40–58 in lists and grids, 72–112 for empty states.
  - Tones (copy the exact values from `FIcon.dc.html` into `tokens.json` as `color.service.<tone>.{fg,bg,fgDark,bgDark}`): coral, blue, mint, violet, amber, pink, lime, peach, teal, ink.
  - Service map:

    | Service | Icon | Tone |
    |---|---|---|
    | Consultations | stethoscope | blue |
    | Pharmacy | pill | coral |
    | Labs | test-tube | mint |
    | Radiology | scan | violet |
    | Nursing | first-aid-kit | teal |
    | Nutrition | bowl-food | lime |
    | Maternity | baby | pink |
    | Map | map-trifold | amber |
    | My health | heartbeat | coral |
    | Emergency | ambulance | peach |
    | Mental health | brain | violet |
    | Family | users-three | peach |
    | Insurance | shield-check | blue |
    | Points | star | amber |

  - Libraries: `@phosphor-icons/react` (web) and `phosphor-react-native` (app).
- **No emoji. No cartoon avatars** (use real doctor photos, or a neutral placeholder). No wallet or stored balance. No fake ratings, counts or prices.
- **Product decisions:**
  - First launch shows Welcome (language, theme, Apple on iOS only, Google, X, Snapchat, register, login, guest). Every later launch opens Home as a guest; login is asked for only at checkout or booking.
  - Login is email-or-phone + password. There is **no phone OTP**. After registration, the email confirmation code stays (the current backend flow).
  - Pharmacy orders are broadcast to nearby pharmacies (3 → 5 → 8 km), which send offers. The patient picks one, then pays. The pharmacy does not see the address or phone before the offer is accepted.
  - Insurance: the provider requests approval; the patient pays only the copay. Nabd+ never approves claims.
  - Loyalty points: up to 10% of an order.

## 2. Boards (authoritative)

### Batch 1
| Board | Screen |
|---|---|
| Main | logo |
| Welcome, WelcomeDark, Login, LoginDark, Otp (email code), Register | via the `Auth` component |
| HomeApp, HomeAppDark | home with the tab bar |
| Search, SearchWeb | search |
| ServiceHub | labs and radiology hub |
| Consult | consultations hub + DoctorCard |
| ProductFull, ProductWeb | product detail |
| DoctorFull | doctor profile |
| AuthWeb | desktop login |
| IconGallery | icon set |

### Batch 2 (templates)
| Board | Screen |
|---|---|
| PharmacyHub | pharmacy hub |
| Cart | cart |
| PharmacyOffers | broadcast offers |
| CheckoutV2 | payment: direct or insurance |
| OrderTracking | order tracking |
| Orders | order list |
| RxUpload | prescription upload |
| Appointments | appointment list |
| BookingConfirm | booking confirmation |
| HealthHub | my health |
| Family | family |
| Insurance | insurance |
| Account | account |
| Settings | language, theme, notifications |
| Notifications | notifications |
| CareHub | template for maternity, nutrition, mental health and chronic care |
| States | empty, error, offline, 404 |
| HomeWeb | desktop home |

## 3. Shared components (build first, use everywhere)
- `packages/ui` (web) and `packages/ui-native` (app):
  - FIcon, ServiceTile, ListRow, SectionHeader, Card
  - Segmented (track `#EAEAEF`, white selected), Chip / StatusChip, Toggle, Radio
  - PrimaryButton, OutlineButton, IconButton (44×44, aria-label)
  - SearchField, Stepper, StickyFooter (glass + safe area)
  - TabBar (floating glass; active item = ink pill with label; centre coral raised Consultations button)
  - DoctorCard (organic photo shape; coral footer with rating, next slot, price and "احجز")
  - ProductCard, OfferCard, Timeline, ProgressRing
  - EmptyState / ErrorState / OfflineState
- Every screen is composed from these components. No one-off styling.

## 4. Remaining screens (designed by you in the same system)
- The patient app has about 270 routes (`patient-app/app/**`) and the web has about as many (`patient-web/app/[locale]/**`). **All of them get the new design.**
- Build `docs/design/SCREEN_INVENTORY.md` from the code: one row per route (app and web). Columns:
  - the template it uses (hub, list, detail, form, flow step, tracking, result, settings, state)
  - the closest board
  - the API endpoints it uses
- Design each screen from its closest board and template, using the real API fields only. Hide any element whose data does not exist.
- Order:
  1. pharmacy flows
  2. consultations and video
  3. labs and radiology flows
  4. nursing / home care
  5. health records and reports
  6. family
  7. insurance
  8. maternity, nutrition, mental health and chronic care
  9. AI tools
  10. community and articles
  11. loyalty and offers
  12. account, settings, support and returns
  13. remaining web-only pages
- For each batch, send the owner screenshots at 390, 768 and 1440 in light and dark, and wait for approval before the next batch.

## 5. Motion
- **Page entrance:** sections rise 14 px with a fade, 420 ms, `cubic-bezier(.22,1,.36,1)`, 50 ms stagger, total ≤ 500 ms, once per page.
- **Brand:** the logo dot beats at 60 bpm; the ECG line draws in 1.4 s on Welcome, Home and the web home.
- **Feedback:**
  - press: scale 0.97, 120 ms, with haptics on mobile
  - add-to-cart: the count bumps
  - segmented: 200 ms
  - button states: loading spinner → success check
  - broadcast: a pulse ring
  - order tracking: the moving marker
- Respect Reduce Motion (OS setting / `prefers-reduced-motion`).

## 6. Acceptance for every screen
- Matches its board or template; colours, sizes and spacing come from tokens.
- Light and dark; 6 languages with full RTL and LTR; font scaling up to 200%.
- Passes `DEVICE_STANDARD.md` on every listed device and OS.
- Real data only, with loading (skeleton), empty, error and offline states.
- Lint gates: `no-raw-color`, `no-emoji-in-ui`, `no-left-right`, `no-100vh`, no `SafeAreaView` imported from `react-native`.
