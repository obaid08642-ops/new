# Phase 0B semantic evidence — e2e/matrix2.js

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `e2e/matrix2.js:1–563`

The matrix is a deep lifecycle E2E runner against `http://127.0.0.1:4099/api/v1`, with Axios, direct MongoDB access and a helper that records PASS/FAIL/SKIP (`1–28`). It reads `/tmp/e2e/boot.ok`, connects to `nabdah_e2e`, hashes test passwords with bcrypt and directly upserts TEST users, provider accounts, catalog records, provider profiles and pharmacy inventory (`30–102`). This is a deliberately test-only fixture setup, not production data.

The suite covers patient/stranger registration, admin login with log-extracted 2FA, six provider/driver logins, provider onboarding/email OTP/profile/phone/KYC documents/bank account/submit/admin approval (`104–229`). It covers lab booking/provider inbox/state transitions/invalid transition/role guard/pipeline/report/patient-stranger access/referral rejection/capacity (`231–321`), radiology booking/provider queue/anonymous rejection/provider response/machine allocation/scan finalization/patient report (`323–369`), home-nursing booking/provider queue/accept/transit/geofence/no-show/start/complete/patient list/wallet (`371–442`), pharmacy order/queue/accept-preparing-ready/driver dispatch-delivery/history/cancel (`444–511`), and cross-cutting reviews/aggregate, notifications, admin audit log and KYC persistence (`513–546`). Summary counts passes/fails/skips and closes Mongo (`548–562`).

The suite directly seeds the database and uses fixed synthetic identities, test emails/phone numbers, placeholder clinical/catalog values and a fake PDF base64 payload (`31–102,190–199,280–290,423–426`). This is appropriate as a local E2E fixture but cannot prove production data truth, real storage, real credential verification, payment settlement or live external provider behavior. It does not use the owner/stranger sandbox accounts described in the later audit workflow and should not be confused with sandbox-contract coverage.

Several assertions are permissive: some responses only check a state if present, pharmacy transitions accept multiple states, and provider/radiology/home-care flows often assert presence/status rather than ownership/404 for a stranger (`279–299,333–369,387–442,465–510`). Direct Mongo seed access bypasses public authorization and may conceal route-level provisioning/foreign-key failures. The suite does not globally assert idempotent replay, duplicate prevention, cross-tenant BOLA across every surface, cookies/httpOnly/token absence, payment-intent truth, refund/reconciliation, or cleanup/cancellation of every created entity; it closes Mongo but has no explicit entity cleanup before exit (`30–102,548–562`). It relies on log OTP extraction and `/tmp/e2e/backend.log`, which is brittle and log-sensitive (`115–130,161–173`).

No execution was performed during this semantic read, so the documented reference result of 65/0/0 in README is not independently re-established here, and no product code was changed.


## e2e/boot.js read (full: 1–55)

`e2e/boot.js` creates MongoMemoryServer on fixed port 27077/database `nabdah_e2e`, discovers or spawns Redis on 6388 bound to loopback, waits for a TCP connection, then spawns `/tmp/build-be/dist/main.js` with an explicit development/test environment (`1–37`). The environment uses a fixed test JWT secret, low bcrypt rounds, wildcard `ALLOWED_ORIGINS=*`, disabled rate limiting, `OTP_PROVIDER=mock`, test Moyasar keys and fake LiveKit settings (`27–36`). It probes `/api/v1/seo/robots.txt` for up to 120 seconds, treating any HTTP response as readiness, writes the Mongo URI to `/tmp/e2e/boot.ok` and prints READY (`42–52`).

The boot script does not assert application health/readiness semantics, dependency readiness beyond a TCP Redis connect, route security, schema migrations, seed isolation or production-config parity. It does not register signal handlers or terminate the spawned app/Redis/MongoMemoryServer on success/failure; `mongod`, `redis` and `app` are local variables without shutdown cleanup (`4–18,37–54`). Fixed port/data/log paths can collide across runs. The mock OTP, wildcard origin, disabled rate limit, fixed JWT secret and test payment/LiveKit credentials are explicitly non-production and must never be used as deployment evidence (`27–36`). No execution was performed during this read and no product code was changed.


## scripts/test-flow.js read (full: 1–71)

This script is a local assertion-only simulation. It defines a simplified in-memory BOOKING state map (`PENDING→CONFIRMED/CANCELLED`, `CONFIRMED→IN_PROGRESS/CANCELLED`, `IN_PROGRESS→COMPLETED/FAILED`) and PRESCRIPTION map (`ISSUED→DISPENSED/CANCELLED`) with a pure `isValidTransition` helper (`8–28`). It then prints a simulated guest-to-auth step using hard-coded `{ id: 'usr_123', role: 'PATIENT' }`, walks one happy booking path and checks only `COMPLETED→PENDING` rejection, then walks `ISSUED→DISPENSED` (`30–68`). It catches errors and does not expose an exit-code assertion contract (`69–71`).

The script does not call HTTP routes, connect to Mongo/Redis, authenticate, verify ownership/tenant/roles, validate DTOs, test the actual backend state machine, test time/slot locks, payment/insurance, idempotency/replay, notifications, audit, privacy or cleanup. Its state configuration is duplicated local policy and may diverge from production transitions. The success message claims “100%” and “flow verified” despite the scope being only a small pure-function simulation (`67–68`). No execution was performed and no product code was changed.


## scripts/test-extensions.ts read (full: 1–310)

This TypeScript integration script creates an application context from AppModule, sets a fixed JWT secret and DB_NAME, resolves NabdExtensionsService/AiService and multiple Mongoose models, then obtains additional dynamic models from the active connection (`1–52`). It deletes all records from a broad set of collections before seeding patient, medical profile, pharmacy/nurse providers, inventory, home-care visit, lab sample and corporate account fixtures (`53–146`).

It asserts wallet credit/debit, referral code/bonus balances, feature flags, medical timeline and health passport fields, JWT QR verification, treatment-program enrollment, geo pharmacy/nurse matching, provider ranking, fraud aggregation, nurse geofence, lab critical ranges, corporate credit limits, AI copilot output and AI emergency triage (`148–298`). Assertions are local service/model assertions rather than HTTP contract tests. The test uses fixed synthetic IDs/PII-like values, seeded clinical facts, hard-coded financial limits, a fake test JWT secret and direct destructive `deleteMany({})` across collections (`26–29,53–69,71–146`).

The destructive collection cleanup is broad and lacks namespace/tenant guardrails; if pointed at a non-test database it could erase data (`53–69`). The script does not establish owner/stranger/unauth route behavior, DTO validation, session cookies, BOLA, idempotency/replay, payment settlement/refund, audit/event/notification delivery, queue behavior, production AI provider grounding, or external integration truth. It also does not ensure seed cleanup beyond app context close (`303–305`). The AI assertions depend on exact ICD/drug/urgency output and do not validate safety disclaimers, provenance, confidence, escalation logging or prompt/data handling (`287–296`). The final top-level catch only logs errors and does not explicitly set a non-zero exit code (`309`). No execution was performed during this read and no product code was changed.


## infra/livekit.yaml read (full: 1–32)

The LiveKit configuration listens on port 7880 with an empty bind address, defines a literal placeholder API key/secret, enables TURN with `turn.example.com`, empty certificate/key paths, TLS/UDP ports and placeholder external IP `1.2.3.4`, forwards webhooks to an HTTP backend URL using the same placeholder API key, and enables external-IP RTC over UDP ports 50000–60000 (`1–32`).

This file contains non-production credentials/placeholders and no secret indirection, rotation or startup fail-closed rule (`6–8,21–25`). Empty bind configuration and broad RTC port range require explicit network/firewall exposure review (`2–4,27–31`). TURN has enabled TLS port but empty cert/key paths and example domain/IP, so secure relay operation is not evidenced (`10–19`). Webhook delivery is plain HTTP and the config does not show signed webhook verification, TLS, replay protection, allowlisting, timeout/retry/dead-letter behavior or tenant/room authorization (`21–25`). No TLS certificate lifecycle, observability, rate limiting, room policy, egress controls, recording/storage security or disaster-recovery configuration is represented. No runtime validation was performed and no product/infrastructure code was changed.


## infra/turnserver.conf read (full: 1–29)

Coturn listens on UDP 3478 and TLS 5349, enables REST auth secret plus long-term credentials, uses literal `change_this_secret`, realm `turn.example.com`, binds to `0.0.0.0`, leaves external IP commented with an example, leaves TLS cert/key directives commented, enables fingerprint/no-multicast/syslog and relays UDP ports 49152–65535 (`1–29`).

The static auth secret is a placeholder and is not sourced/rotated from a secret manager (`5–8`). Binding to all interfaces and a broad relay range are configured without firewall/ACL/rate-limit/abuse/capacity controls (`10–13,26–28`). External-IP/NAT advertisement is not active and references an example only (`12–13`). TLS port is declared but certificate and key paths are commented, so secure TURN/TLS operation is not evidenced (`15–17`). The config does not represent certificate renewal/trust, origin restrictions, allocation quotas, tenant/room binding, credential TTL enforcement, logging redaction/retention, metrics/health, HA/failover or disaster recovery (`5–28`). No runtime validation was performed and no product/infrastructure code was changed.


## infra/docker-compose.infra.yml read (full: 1–43)

The compose file defines MongoDB 6.0, Redis 7 alpine, Coturn latest and LiveKit latest (`1–38`). MongoDB publishes `27017:27017` with a persistent volume; Redis publishes `6379:6379`, enables AOF and persists `/data`; Coturn and LiveKit use host networking and bind local configuration files; all services use `restart: always` (`4–38`). Named volumes are declared for MongoDB and Redis (`40–43`).

MongoDB and Redis are exposed on all host interfaces as written, with no auth, TLS, network restriction, resource limits, healthchecks, backup/restore or init/replica configuration represented (`4–21`). Images are not digest-pinned, and Coturn/LiveKit use `latest`, creating supply-chain and reproducibility risk (`23–38`). Host networking for media services bypasses normal container network isolation and exposes their configured ports directly (`23–38`). No secrets/environment injection, non-root user, read-only filesystem, capabilities drop, seccomp, logging limits, dependency health ordering or graceful shutdown policy is represented. No runtime compose validation was performed and no product/infrastructure code was changed.


## infra/fastapi/tests/conftest.py read (full: 1–80)

The pytest fixtures read `FASTAPI_TEST_BASE_URL`, skip external tests when it is absent, create a session-scoped `requests.Session` with JSON content type, log in an admin using environment credentials, and return a bearer token/header (`1–40`). They generate a timestamp-based patient identity with hard-coded test name/password/role, register it against `BASE_URL`, and return a bearer token/header (`42–63`). They also create a timestamp-based guest via `/api/auth/guest` and return a bearer token/header (`66–79`).

Admin credentials are sourced from environment variables but are not asserted to be approved sandbox identities or redacted from assertion failures (`23–34`). Patient password and generated test identity are hard-coded/weak for production standards (`43–51`). Patient and guest fixtures use `BASE_URL` directly rather than the validated `base_url` fixture (`54–74`), so missing/invalid base URL handling is inconsistent. All authentication is modeled as bearer tokens in headers; cookie/httpOnly, token leakage, refresh/revocation and session security are not covered (`37–79`).

Fixtures are session-scoped and create external users but provide no teardown, cancellation, deletion or cleanup; repeated runs can accumulate accounts and expose generated PII/test credentials in remote logs (`42–74`). No owner/stranger/unauth, tenant, payment, idempotency/replay, rate-limit, CSRF, authorization, test-environment allowlist or API-version assertion is represented. Skips are used when prerequisites are absent, so a green run can omit all external integration coverage (`9–13,23–28`). No execution was performed and no product code was changed.


## infra/fastapi/tests/test_nabd_backend.py read (full: 1–415)

The pytest module covers root health, guest/patient/admin auth, unauthenticated `/me`, bad-password rejection, reference lists, doctor listing/filter/search/detail/not-found/onboarding, product listing/category/alternatives/visual-search, appointment create/list and guest insurance rejection, order create/list, health passport/vitals/update, review auto-approval/pending moderation, ticket priority mapping, admin stats/RBAC and doctor verify/reject, and chat send/get (`1–415`). It uses the shared fixtures from conftest and asserts mostly status codes, selected fields and minimum/count assumptions.

The suite relies on external `FASTAPI_TEST_BASE_URL` and the `base_url` autouse fixture, but many tests assume seeded content counts/identities such as 16 cities, 28+ specialties, 18+ insurance records, 50+ labs, 20+ radiology entries and a doctor named/searchable as Sarah (`72–142`). These assumptions are not seeded or contract-pinned in the module. Appointment dates are fixed in the past relative to the current audit date (`206–239`), and product visual search invokes an external AI path with generated image data and a 60-second timeout (`190–204`).

Mutations generally assert 200 and selected response fields but do not add idempotency keys or test replay/duplicate behavior for registration, onboarding, appointments, orders, vitals, passport updates, reviews, tickets or chat (`28–327`). Owner/stranger/unauth coverage is limited to `/auth/me`, guest insurance, admin stats and health passport; most patient/provider/admin object reads and writes lack BOLA/cross-tenant checks (`206–315,330–374,377–415`). Payment tests only assert a computed numeric total and pending status; no authorization, capture, refund, reconciliation or server-price integrity is proved (`241–258`).

The chat auto-close test explicitly does not manipulate/verify `auto_close_at`; it only confirms a newly created room is active, so the named auto-close behavior is not tested (`397–415`). Review approval behavior, ticket priority and admin/provider lifecycle use hard-coded expectations without concurrency, abuse, moderation, audit or cleanup assertions (`295–374`). Tests create patient/guest/doctor/ticket/order/chat records but no teardown/cleanup is defined in the module. No runtime execution was performed during this read and no product code was changed.
