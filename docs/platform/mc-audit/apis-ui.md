# API and screen impact (Phase 1, read-only)

## API rules (target)
1. Server resolves `MarketContext` per request; the client may send a hint (`X-Market`, selected market) but the server validates it against account, provider and order.
2. Money in responses: `{ amount_minor, currency }`; old fields (`price`, `*_halalas`) kept for SA until clients migrate (byte-identical).
3. Refuse market-scoped queries without a market (guard), except explicit admin all-markets scope.

## Backend modules and the change they need
| group | controllers (evidence) | impact |
|---|---|---|
| Auth/identity | `auth`, `auth/passkey`, `users` (`auth/auth.service.ts:423-441`) | phone plugin, market on account, OTP plugin |
| Addresses | `users/me/addresses`, `national-address` | address template endpoint `GET /markets/:id/address-template`; verification optional |
| Catalogue/search | `catalogs`, `search`, `seo-search`, `doctors` | filter by market; registration join |
| Booking | `booking/flow`, `bookings`, `unified-bookings`, `ordering`, `quotes` (`common/quote.ts`) | quote carries market, currency, tax snapshot |
| Pharmacy | `pharmacy`, `patient/pharmacy`, `provider/pharmacy/broadcasts`, `ordering/*` | broadcast audience = market; offer currency |
| Payments | `payments`, `payments/webhook`, `moyasar`, `finance-engine`, `payouts`, `billing` | gateway per market; webhooks per gateway; invoices per operator |
| Refunds | `refunds`, `refund-policy`, `returns` | same currency; policy per market |
| Providers | `provider-onboarding`, `provider/*`, `provider-ops` | field sets, licences per jurisdiction |
| Admin | `admin/*` (~40 controllers) | market-scoped RBAC; market filter on lists/exports |
| Config | `config`, `system-config`, `feature-flags`, `business-rules` | `GET /config/market` returns typed MarketConfig version |
| Content | `legal`, `articles`, `notifications` templates | per market + locale |
| Infra | `events`, `durable-events`, `push`, `mail`, `redis`, `storage`, `media`, `realtime` | events/queues/keys carry market |
| Webhooks | `webhooks`, `payments/webhook` | route to gateway plugin by market |
| MCP / AI | `mcp`, `ai`, `ai-commerce` (`ai-commerce.service.ts:95`) | prompts/tools scoped by market, currency not literal |

## Screens (grouped; evidence in `saudi-assumptions.md` B-E)
| app | screens | change |
|---|---|---|
| Patient app | login/signup (phone chip `AuthKit.tsx:106`), address forms, national-ID form (`NationalIdForm.tsx:8`), consult booking (`ConsultBooking.tsx:26`), map screens (`ProvidersMapView.tsx:39`), price components (`OfferKit.tsx:86`), insurance, wallet, legal pages, support, emergency | market-driven fields from server config; currency formatter; market switcher in settings; store listing per country |
| Patient web | same plus SEO: sitemap(s), robots, llms, hreflang, JSON-LD currency, legal pages (`lib/legal/embedded-policies.ts`), `format-slot.ts:1` | per-market routes/sitemaps/canonicals, branding by market |
| Provider app | registration forms (`DoctorRegistration.tsx:38`, `NursingRegistration.tsx:53`), city lists (`constants/index.ts:152`), phone, revenue ("ر.س"), documents | dynamic form schema per (market,type); locations data |
| Admin | provider detail (`ProviderFullDetail.tsx:128,384`), finance config, refund policy (`refund-policy.ts:17`), catalogue edit, search, alerts | market switcher + scope, per-market config editor, licence/expiry lists |

Not-a-screen impacts: deep links, universal links per domain, app store assets per country, push topics per market, QR/receipt layouts.
