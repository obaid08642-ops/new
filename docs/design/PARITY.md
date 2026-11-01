# Parity: patient web and patient app (owner order 2026-10-31)

How this was made: **by reading the code on main (c929c4efa) on both sides, no renders.** "Same" means both sides implement the same behaviour and states from the same decision and I found the matching file on each side; it does **not** mean pixel-identical, which needs a render of both. "Not compared" means I could not tell from the code and need either the owner's spec or a render. Nothing here was fixed yet (see Counts).

| # | Feature | Web (file) | App (file) | Same? | Gap |
|---|---|---|---|---|---|
| 1 | Consultations hub: My appointments, Upcoming / Current / Past, outcomes, "new results" badge | `patient-web/app/[locale]/appointments/page.tsx`, `lib/consult/appointment-view.ts`, `lib/consult/outcomes.ts`, `components-next/core/appointments-link.tsx` | `patient-app/app/consultations/appointments.tsx`, `src/components/consult/AppointmentSections.tsx`, `src/utils/appointmentTabs.ts`, `src/utils/appointmentOutcomes.ts`, `src/hooks/useNewOutcomesCount.ts` | Same | Web has Upcoming / Current / Past as a link-segmented control; the app builds the same split in `appointmentTabs.ts`. Visual not compared. |
| 2 | No cart on consultation pages | `components-next/core/core-shell.tsx` (the header shows My appointments in the cart's place when `appointmentsHref` is set) | `patient-app/app/(tabs)/consultations/index.tsx` (no cart button) | Same on the tab | Sub-pages of consultations on the app (doctor list, doctor detail, booking) not checked for a cart button. |
| 3 | Specialties swipe row, "All specialties" grid, illustrations, "Coming soon" | `components-next/consult/specialty-tiles.tsx`, `app/[locale]/consultations/specialties/page.tsx`, `packages/ui/icons/specialty-art.ts` | `patient-app/src/components/consult/SpecialtyTiles.tsx`, `app/consultations/specialty-select.tsx` | Same | The app's Coming-soon tile still uses muted text on the sunken background (4.15:1 on web before the fix, which uses the primary text token). Owner/reviewer to decide on the app tile. |
| 4 | Labs / radiology cart as one sheet with two groups (labs, scans) | `components-next/core/cart-sheet.tsx` (groups `cartGroupLabs`, `cartGroupScans`), `components-next/diagnostics-cart-client.tsx` | `patient-app/src/components/cart/ServiceCartButton.tsx` (a chooser sheet listing the carts), `app/diagnostics/cart.tsx` (labs and scans quoted separately) | Not compared | The app opens a chooser sheet per service plus a cart page; I did not confirm it shows **one sheet with two groups** like the web. Needs the owner's spec or a render. |
| 5 | Home top-bar order | `components-next/core/core-shell.tsx` (brand, search, links, notifications, cart or My appointments, account) | `patient-app/src/components/home/HomeTopRow.tsx` (avatar, language, theme, bell, wishlist, cart, menu) | Differs | The two orders differ. I do not have the owner's written order, so I cannot say which side is wrong. Needs the spec. |
| 6 | FAB cut-out on every tab | `components-next/home/home-tab-bar.tsx` (web has a phone tab bar) | `packages/ui-native/src/shells/TabBar.tsx` (cut-out, `fabCentre`), `patient-app/src/components/navigation/MainTabBar.tsx` | Not compared | Whether the web bar has the same cut-out and a centred action was not checked; needs a render. |
| 7 | Nursing page: every service with a "from" price | `app/[locale]/nursing/catalog/page.tsx`, `components-next/nursing/nursing-offers.ts` | `patient-app/src/components/nursing/NursingServiceList.tsx`, `app/(tabs)/nursing.tsx` | Same | Both draw the nurses' own "from" price and provider count. |
| 8 | Nursing "Not available in your area yet" + Notify me | not built | not built | n/a | Blocked on a backend signal: `/home-care/services` takes no city or coordinates (comment on #2148). |
| 9 | Empty-provider pages with Notify me | `components-next/diagnostics/notify-me-button.tsx`, `components-next/diagnostics/offers-section.tsx` | `patient-app/src/components/diagnostics/CatalogueKit.tsx` | Same | Guest registration for the interest list has no phone or email in the API (known backend gap). |
| 10 | Receipt with the print animation | `components-next/receipt/receipt-paper.tsx`, `app/[locale]/receipts/**` (#2294) | none yet | App missing | H wires the app side. Entry links on paid bookings and orders are not on the web either. |
| 11 | Chat ticks (sent / delivered / seen) | `lib/chat/receipts.ts` (seen), `components-next/consult/chat-composer.tsx`; the proxy allows `/delivered` and `/read` | `patient-app/app/consultations/chat-with-doctor.tsx`, `src/types/index.ts` | Not compared | Web draws seen only; whether it draws delivered ticks was not confirmed. Backend delivered events are in #2173 (open). |
| 12 | Chat offline queue | none found (`grep` for outbox / offline queue on web: no hit) | `patient-app/src/services/offline/outbox.ts`, `src/chat/outboxRunner.ts` | Web gap | Web has no offline queue for chat messages. Behaviour belongs to H's logic; the web UI would need failed-message retry at least. |
| 13 | Call screens (states: connecting, reconnecting, poor network, audio only, ended) | `components-next/video-room-client.tsx`, `app/[locale]/room/[id]/page.tsx` | not located under `patient-app/src/components/call*`; calls are H's #2176 | Not compared | Polish pass waits on H's #2176 and #2173. |
| 14 | Sign-in with a code (OTP) | `patient-web/app/[locale]/otp`, `components-next/auth/*` | `patient-app/app/(auth)/otp.tsx` | Not compared | Both exist; look not compared. |

## Counts

- Features listed: 14 = 5 same + 3 differ or gap + 5 not compared + 1 not built on either side.
- Same (by code): 5 (rows 1, 2, 3, 7, 9).
- Differs or a confirmed gap: 3 (row 5 top-bar order, row 10 receipt on the app, row 12 chat offline queue on the web).
- Not built on either side: 1 (row 8, blocked on the backend).
- Not compared (need the owner's spec or a render): 5 (rows 4, 6, 11, 13, 14).
- Fixed by this PR: 0. This PR is the table only.

## Not covered yet

"Every other screen redesigned in the last two days" is not in the table: I did not build the list of those screens or compare them. Next step: take the merged design PRs of 2026-10-29 to 2026-10-31 (#2118 to #2165, #2171) and add one row each.

## Gaps for H (app), with file

- Row 4: confirm whether the cart should open one sheet with two groups; `patient-app/src/components/cart/ServiceCartButton.tsx` (chooser at line 39) and `patient-app/app/diagnostics/cart.tsx`.
- Row 5: the top-bar order, once the owner's order is known: `patient-app/src/components/home/HomeTopRow.tsx:47-82`.
- Row 10: the receipt on the app (H).
- Row 3: the Coming-soon tile contrast in `patient-app/src/components/consult/SpecialtyTiles.tsx:61`.

## Gaps for the web

- Row 12: failed-message retry (and an offline queue if H defines it) in `patient-web/components-next/consult/chat-composer.tsx`.
- Row 10: "Receipt" link on every paid booking and order.
