# Phase 0B semantic evidence — patient-web-auth.contract.spec.ts

**Archive member:** `src/modules/auth/patient-web-auth.contract.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–148 from the baseline archive extraction.

Lines 1–37 build an AuthService unit-test harness with in-memory Map-backed Redis mocks, user/patient model mocks, JWT mock, and EventBus mock. The harness's Redis client implements only basic set/del and NX-like behavior.

Lines 39–61 assert a one-hour access token, fourteen-day refresh token, and matching Redis refresh session TTL. Lines 63–72 assert that compliance consent stores policy ID/version on the user.

Lines 74–101 assert Contract V1 patient registration: user/patient creation, patient role, locale, legal consents, OTP initialization, and no session token in the registration response. Lines 103–112 assert bounded success response for unknown-account OTP requests to reduce account enumeration.

Lines 114–129 assert valid patient OTP creates a 60-second exchange token stored with user/device IDs and does not query the user model during verification. Lines 131–135 assert missing/expired OTP raises GoneException.

Lines 137–147 assert an exchange token is consumed once and that AuthService returns access/refresh tokens internally; the test comment says the controller DTO must not return those session tokens.

**Auth/ownership:** tests cover patient contract semantics but do not cover stranger/owner resource authorization; mocks do not exercise actual controller cookie exchange.

**State transitions:** registration → OTP pending; OTP valid → exchange token; exchange token → session token once; expired/missing OTP → Gone.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** this is a mock-based contract suite, not an integration proof; it asserts controller DTO behavior only by comment and does not instantiate controller/cookie serialization; unknown-account OTP response is intentionally bounded; tests omit rate-limit exhaustion, wrong-code attempts, device binding, Redis errors, social verification, password reset, and cookie attributes. The second exchange call is expected Unauthorized, but first-call session-token exposure remains at service layer by design and requires HTTP-boundary proof.

**Test implications:** add real controller boundary tests, HttpOnly/Secure/SameSite cookie checks, no body/URL token checks, rate limits, invalid/wrong OTP, exchange replay, device trust, Redis failure, and owner/stranger/unauth contract suites. No tests executed during this semantic read.

**Consumer traceability:** test-to-controller/service coverage will feed the dedicated route-to-consumer phase.
