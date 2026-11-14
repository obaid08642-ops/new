# Colour audit, patient-app, slice 1 (hubs, home, shared components)

Runtime: rendered with `tools/design/render-native-screen.mjs --api fixture` (react-native-web, test data, light + dark for home/services; light for the rest). No backend was started. Temporary screenshots deleted.

| screen | board colour | live colour | fixed | file:line |
|---|---|---|---|---|
| Home (tiles, health rows, offers, points, AI card) | service tones | service tones (matches) | n/a | patient-app/src/components/home/HomeParts.tsx |
| Services hub | tones per service | tones (matches) | n/a | patient-app/app/(tabs)/services.tsx |
| Pharmacy hub | coral tiles, ink add/camera buttons | same | n/a | patient-app/app/(tabs)/pharmacy.tsx |
| Consultations hub | blue/mint/violet chips, coral doctor footer | same | n/a | patient-app/app/(tabs)/consultations/index.tsx |
| Labs and radiology hub | mint/violet tiles, ink "details" | same | n/a | patient-app/app/(tabs)/diagnostics.tsx |
| Nursing hub | teal cards, ink "book" | same | n/a | patient-app/app/(tabs)/nursing.tsx |
| My health hub | coral/violet/mint rows | same | n/a | patient-app/app/(tabs)/health.tsx |
| Account rows | gear ink, rest tones | same | n/a | patient-app/src/components/account/AccountView.tsx:124 |
| Shared FIcon/Button/EmptyState/StatusChip/TabBar | tones; ink pill active tab, outline secondary | same | n/a | packages/ui-native/src |
| Pharmacy offer card, pharmacy logo | coral (pharmacy tone) | neutral grey square | y | patient-app/src/components/pharmacy/OfferKit.tsx:~176 |
| Clinic detail, no-image placeholder | blue (consult tone) | neutral grey | y | patient-app/app/consultations/clinic/[id].tsx:~84 |

Result: the app slice was already on the tones; the hubs and shared components match their boards. Ink buttons on cards are on the boards (PharmacyHub, Ord02-ServiceHome). Static only: other screens not rendered. Not covered: the owner's "black" screens may be web; the app showed none in this slice.
