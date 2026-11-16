# Web / app parity, round 2 (route level, 2026-11-16)

Round 1 (`PARITY.md`) followed the web design PRs of 2026-10-28 to 2026-11-01. Round 2 asks the other question: which screens exist on one side only. Source: the route lists of `docs/design/inventory/screens.json` (446 routes: patient-app 258, patient-web 188) and the two route trees (`patient-app/app`, `patient-web/app/[locale]`). No renders; nothing was changed in either client.

An endpoint-level diff (method + path per client) was tried first and dropped: the two clients record the same endpoint differently (web calls `*` through its proxy, the app calls `GET`/`POST` direct), so about 180 "app only" and 37 "web only" endpoints are mostly the same call under another spelling. Route names are the reliable signal.

## Top-level route groups on one side only

| Side | Group | Same thing on the other side | Verdict |
|---|---|---|---|
| app only | `ai-assistant`, `ai/*` | web `/ai` (patient-web/app/[locale]/ai) | covered |
| app only | `wearables` | web `/health/wearables` (`health/wearables/page.tsx`) | covered |
| app only | `reset-password` | web `/password-reset`, `/forgot-password` | covered |
| app only | `language` | web keeps the language in the URL locale prefix (`app/[locale]`) | n/a (platform) |
| app only | `intro`, `shared` | onboarding stack and shared pickers (location, date) | n/a (platform) |
| web only | `refund-policy` | app: `components/legal/RefundPolicyTick.tsx`, `settings/help.tsx`, `consultations/cancel-reschedule.tsx` | covered |
| web only | `telehealth-consent` | app: `settings/telehealth-consent.tsx` | covered |
| web only | `appointments`, `prescriptions`, `wishlist`, `cart`, `chat`, `dashboard` | app: `consultations/*`, `health/prescriptions.tsx`, `pharmacy/wishlist.tsx`, `pharmacy/cart`, consultation chat, home tab | covered (different names) |
| web only | `c`, `p`, `q`, `condition`, `doctors`, `labs`, `medicines`, `pharmacies`, `home-nursing`, `radiology`, `medicine-catalog`, `features` | public landing and SEO pages (category, product, condition, city pages). The app serves the same data through `search`, `pharmacy/product-detail`, `diagnostics/*` | by design: indexed pages for search engines |
| web only | `oauth`, `verify`, `receipt/shared`, `offline`, `unavailable` | browser flows (OAuth consent, public sick-leave check, shared receipt link, offline and outage pages) | by design: need a browser |
| web only | `community/[postId]` | none needed: the page is 11 lines and redirects to `/articles` (`community/[postId]/page.tsx:10`) | by design: legacy URL redirect |

## Result

- No transactional screen (booking, payment, orders, health records, family, insurance) exists on one side only.
- Every one-sided route group is either covered under another name on the other side, a platform screen, a public SEO page, a browser-only flow, or a legacy redirect.
- No gap found, so there are no per-gap PRs to open from this round. Nothing needs an owner decision.

A finer pass (field by field inside paired screens: filters, empty states, actions) is a separate, larger audit; it is not part of this round.
