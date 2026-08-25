# Phase 0B semantic evidence — Application module wiring

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/app.module.ts:1–271`

`AppModule` imports a very broad graph spanning patient, provider, admin, finance, payments, booking, realtime, legacy, compatibility, seed, exports, AI, insurance and operational modules (`135–256`). `SeedModule`, `LegacyModule`, `CompatModule`, `AdminSpaModule`, payment/finance modules and multiple overlapping admin/provider/insurance modules all coexist in the root graph. This creates a large blast radius and visible architectural drift; no root-level boundary or allowlist prevents a seed, legacy or compatibility capability from being loaded in the same runtime as production commerce and identity paths.

Configuration defaults use `mongodb://localhost:27017`/`nabd_nestjs` when environment values are absent (`156–165`), and `BullModule` derives Redis defaults to localhost/6379 with optional password/TLS (`63–70,166–168`); no root-level fail-closed assertion is visible here. `InsuranceEngineModule` is imported twice (`127,251`), and the module uses a mixture of canonical class names and string model/provider tokens across the graph. `ConfigModule.forRoot` validates environment, but this member does not establish which required variables are mandatory or prevent local fallback in a sensitive runtime.

Global providers install JwtAuthGuard, RolesGuard, ThrottlerGuard, AuditLogInterceptor and IdempotencyInterceptor (`258–264`). The root wiring does not show route exceptions, ordering semantics, scope/tenant policy, idempotency storage availability, audit redaction, or whether every mutation is covered; those are delegated to classes elsewhere. Throttling defaults to 200 requests per minute (`169–171`) without sensitivity-specific partitioning in this member. BansMiddleware and CorrelationMiddleware apply to every route (`266–269`), but no ordering/error/fail-closed behavior is visible. Health and payout controllers are registered at root (`257`), increasing need for explicit public/admin exposure review. No product code was changed and no tests/builds were executed during this semantic read.
