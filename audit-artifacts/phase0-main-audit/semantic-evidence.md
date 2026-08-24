# Semantic evidence checkpoint — main baseline

## Backend bootstrap

**Source:** `nabdah-backend/src/main.ts`, lines 22–131.

The baseline enables optional memory Mongo only outside production (lines 27–41), requires `ALLOWED_ORIGINS` in production (44–48), configures CORS and credentials (50–61), trusts two proxy hops (64–68), adds Helmet and compression (70–83), enables the configured WebSocket adapter (84), globally registers `SentryExceptionFilter` (86–88), captures raw request body and accepts 25 MB JSON/urlencoded bodies (89–96), sets `/api` prefix and URI versioning (97–101), applies a strict global ValidationPipe (103–108), conditionally exposes Swagger (110–119), enables shutdown hooks (121–124), and listens on all interfaces (126–129).

**Trace implications:** global `JwtAuthGuard`, roles, throttling, audit, and idempotency must be verified at AppModule level and per route. `USE_MEMORY_MONGO` is a test/development facility and must not be treated as production persistence.

## Backend module composition

**Source:** `nabdah-backend/src/app.module.ts`, lines 135–270.

The baseline imports auth, users, orders, prescriptions, medicines, providers, pharmacy/cart, unified bookings, labs, radiology, home-care, insurance, payments/Moyasar/finance, live video, storage, reports, chat, provider/admin/compatibility, and many additional domain modules. It registers global guards/interceptors at lines 257–264 and applies `BansMiddleware` and `CorrelationMiddleware` to all routes at lines 266–269.

**Trace implications:** the large module surface must be disambiguated by controller/schema/consumer evidence; imported modules alone do not prove a usable patient journey or single source of truth.

## Patient Web BFF

**Source:** `nabd-patient-web/lib/api/patient-allowlist.ts`, lines 1–48; `app/api/patient/[...path]/route.ts`, lines 1–12.

The allowlist defines a narrow set of patient read paths (orders, cart reads, selected bookings, health/family/insurance/mental-health/chat/articles) and `isAllowedPatientApiRequest` requires `method === "GET"` (allowlist lines 42–48). The catch-all exports handlers for all verbs, but practical access is rejected with 404 for non-allowlisted/non-GET paths; it requires an httpOnly access cookie, can refresh through the refresh cookie/device cookie, forwards the upstream response, and rotates or clears session cookies.

**Trace implications:** Backend mutation routes cannot be credited as Patient Web mutations merely because the catch-all exports POST/PATCH/DELETE handlers. Web patient mutation coverage must be proven through another concrete route or classified unverified.

## Patient Mobile API/session

**Source:** `nabd_plus_patient_app/src/utils/api.ts`, lines 1–119.

The baseline derives runtime URLs from config (6–10), reads and writes the access token through Expo SecureStore (25–49), removes any legacy AsyncStorage token mirror, attaches bearer authorization when present (52–60), sets a 20-second timeout (64–73), retries exactly once only for GET network failures (76–91), normalizes non-OK responses and clears secure auth on 401/403 (93–110), and rejects invalid JSON (113–117).

**Trace implications:** mutations must not inherit automatic retry; mobile API security/session findings must distinguish this transport from concrete auth providers that may return client-held tokens.

## Patient Mobile splash and tabs

**Sources:** `nabd_plus_patient_app/app/index.tsx`, lines 1–65; `app/(tabs)/_layout.tsx`, lines 1–26.

The splash uses a 2.6-second timer and Reanimated fade-in/fade-out, checks SecureStore token and AsyncStorage guest mode, then routes to welcome or tabs (index lines 17–35). Tabs mount a shared Header and BottomNavBar and expose index, consultations, pharmacy, diagnostics, services, and health; nursing is registered with `href: null` and hidden from tab navigation (tabs layout lines 7–24).

**Trace implications:** splash/guest/auth and hidden nursing navigation require screen/journey trace; animation presence does not establish backend readiness or parity.

## Classification rule

These are source-backed observations. They do not by themselves prove `MISSING`, `PARTIAL`, or `BROKEN`; final findings must combine them with route/schema/consumer/test evidence and the authoritative business rules.
