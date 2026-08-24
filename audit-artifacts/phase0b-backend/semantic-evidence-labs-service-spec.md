# Phase 0B semantic evidence — labs.service.spec.ts

**Archive member:** `src/modules/labs/labs.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–212; full 212-line member covered.

Lines 14–66 construct mocked repositories/models plus EventEmitter, EventBus and WorkflowEngine. Lines 68–81 verify a laboratory provider can transition its own booking. Lines 84–105 test patient ownership for reschedule rejection and assigned-laboratory ownership for GPS updates, including rejection of a different provider.

Lines 107–155 test duplicate sample barcode rejection, successful sample registration with workflow transition to `SAMPLE_COLLECTED`, and rejection before booking confirmation. Lines 157–190 test missing sample, cross-laboratory sample mutation rejection, legal `received -> analyzing` transition via workflow engine, and illegal direct `received -> result_ready` rejection without update. Lines 192–210 test listSamples scoping to provider-owned bookings and an empty result without fallback to all samples.

**Security/ownership:** service-level tests provide positive evidence for provider identity checks, patient reschedule ownership, sample ownership, and non-fallback listing. They do not prove HTTP route guards, authenticated session binding, 404 concealment, role normalization across `provider`/`lab`, tenant isolation, or spoof-resistant identity sourcing.

**State transitions:** NEW_REQUEST -> CONFIRMED -> SAMPLE_COLLECTED; sample received -> analyzing; illegal direct result-ready transition rejected; state mutation delegated to WorkflowEngine.

**Truthfulness/financial source:** no prices, payments, insurance, report PDF, or wallet settlement are exercised in this spec. Barcode duplicate check and registration use mocks; atomic uniqueness/race behavior is not proven.

**Test gaps:** no idempotency/replay tests, concurrent transitions, persistence failure handling, event delivery/retry, malformed DTOs, authorization guards, audit logging, provider role edge cases, or controller integration. No tests executed during this semantic read.
