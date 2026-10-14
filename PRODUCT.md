# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
- **Patients and their families in Saudi Arabia** (primary): residents and expatriates who order medicines, book doctors (video, clinic, home visit), book lab tests, radiology and home nursing, pay directly or through their insurance, and track health for themselves and their family. Many use the app one-handed on a phone, often while unwell or caring for someone.
- **Healthcare providers** (pharmacies, doctors, labs, radiology centres, nursing providers, hospitals): receive and fulfil requests in the provider app. Not in scope for the redesign.
- **The owner/admin**: monitors and controls the platform from the admin dashboard, including on an iPhone.

## Product Purpose
Nabd+ (نبض+) is one healthcare marketplace where a patient can get a medicine, a doctor, a test or a nurse in as few steps as possible, with real prices, real availability and real providers. Success: a returning patient goes from an item to a confirmed order or booking in 3 screens or fewer, and trusts what the app tells them.

## Positioning
All services in one account (pharmacy, consultations, lab, radiology, home nursing, family health), with insurance handled through the provider's own approval and a copay the patient pays in one tap. Pharmacies compete on live offers for each order (staged broadcast 3 → 5 → 8 km).

## Operating Context
- Clients: patient-app (React Native/Expo, iOS + Android) and patient-web (Next.js, SSR) share ONE backend and ONE account; behaviour and data must match.
- Languages: Arabic (RTL, default in KSA), English, Urdu (RTL), Hindi, Filipino/Tagalog, Bengali. The language follows the device and can be changed by the user.
- Theme follows the device (light/dark) and can be changed by the user.
- Payments: card, mada, Apple Pay, insurance copay; loyalty points capped at 10% of the order. No patient money wallet.

## Capabilities and Constraints
- Prescription items require an uploaded prescription (field `requires_prescription`); others do not.
- Insurance: Nabd+ does not approve claims. The provider obtains approval in its own system and records approved / partial / rejected; the patient then pays any copay.
- Privacy: before acceptance a provider sees only the approximate distance and neighbourhood, not the exact address or phone.
- Every screen needs loading, empty, error and success states, real API data, and no mock or placeholder content.
- Target devices: iPhone SE to Pro Max (notch and Dynamic Island), small/medium/large Android, foldables, tablets; web from 320 px to 4K.

## Brand Commitments
- Name: نبض+ / Nabd+. Logo: "Noon Dot", the open bowl of the letter ن with the pulse dot above it (`docs/design/canvas/Main.dc.html`, `packages/brand/`). The wordmark sits next to the mark at first exposure.
- Visual system: `DESIGN.md` (tokens in `packages/design-tokens/tokens.json`). The approved screens in `docs/design/canvas/` are binding.
- Voice: calm, clear, respectful, reassuring; short sentences; medical facts without hype.

## Evidence on Hand
- Real catalog: about 21,000 medicines in 6 languages; real Saudi locations; real providers once onboarded.
- Never fabricate: ratings, reviews, provider counts, prices, availability, "best/top" claims, or patient numbers. Use real data, or leave the space empty.

## Product Principles
1. Fewest steps to care: smart defaults, Buy now / Book now, one-page checkout.
2. Trust through truth: real data only; show what is known, say what is not.
3. One product on every screen: app and web identical in behaviour and look.
4. Calm under stress: legible, forgiving, never surprising, for people who may be ill.
5. Inclusive by default: 6 languages, RTL, large text, screen readers.

## Accessibility & Inclusion
WCAG 2.2 AA: contrast of 4.5:1 for text and 3:1 for large text and icons, in both themes. Touch targets of 44 px or more. Font scaling to 200%. Full RTL support. Reduced motion respected. Every control labelled for screen readers.
