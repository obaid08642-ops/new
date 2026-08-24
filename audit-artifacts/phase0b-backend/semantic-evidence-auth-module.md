# Phase 0B semantic evidence — AuthModule

**Archive member:** `src/modules/auth/auth.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–48 from the baseline archive extraction.

Lines 1–19 import Nest/JWT/Mongoose modules, auth/passkey/device services/controllers, user/patient/provider/passkey/trusted-device schemas, guard, and repositories. Lines 20–34 define a global AuthModule and asynchronous global JwtModule configuration. `JWT_SECRET` is mandatory; startup throws when absent, and production requires at least 32 characters. JWT sign expiry comes from `JWT_EXPIRES_IN` with a one-hour default.

Lines 35–42 import PushModule and register User, PatientProfile, ProviderProfile, PasskeyCredential, and TrustedDevice schemas. Lines 44–46 wire AuthController/PasskeyController, AuthService/PasskeyService/DeviceTrustService/JwtAuthGuard, repositories, and exports for AuthService, JwtModule, JwtAuthGuard, MongooseModule, and DeviceTrustService.

**Auth/ownership:** global JWT module and guard; auth/passkey/device services are shared across modules; schema/repository wiring is module-local but exported where specified.

**State transitions:** module initialization fails closed without JWT_SECRET or with a short production secret; otherwise controllers/services are available globally.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** startup fail-closed is explicit; module JWT sign expiry is configurable while AuthService directly signs access/refresh tokens with its own expiry values; auth guard production verification also checks secret presence. PushModule is imported but delivery behavior is service-dependent.

**Test implications:** startup without/with short JWT_SECRET, configured expiry behavior, provider/schema model registration, global guard availability, passkey/device controller wiring, and AuthService-vs-JwtModule expiry consistency. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
