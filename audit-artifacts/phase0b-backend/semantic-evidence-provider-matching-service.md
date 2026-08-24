# Phase 0B semantic evidence — provider-matching.service.ts

**Archive member:** `src/modules/provider/services/provider-matching.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–212; full 212-line member covered.

Lines 2–14 import request/account/profile/availability schemas and repositories plus geo, capability, scheduling and scoring services. Lines 16–45 define candidate and input shapes. Lines 47–59 construct the matcher with request, account, profile, availability repositories and dependent engines.

Lines 61–72 document a 1000-point ranking model: capability 250 hard gate, distance 200, zone 100, availability 150, reliability 150, inverse workload 100, urgent priority 50 and scheduling/on-duty 50. Lines 73–95 select approved accounts of eligible provider types, optionally exclude IDs, load profiles/availability/scores and iterate candidates.

Lines 96–127 apply capability matching as a hard gate, compute distance and service-zone status, penalize out-of-radius providers without excluding them, and assign neutral distance points when geo data is missing. Lines 129–154 score availability status, reliability snapshot and inverse workload, then add urgent priority boost. Lines 156–168 check scheduled capacity/on-duty status and sum the breakdown. Lines 170–195 build candidates with display identity, distance, availability, rates, workload, capability price, score breakdown and matched-item count, sort descending and limit results. Lines 197–211 load an existing request by ID and build match input from its type/location/payload/priority/schedule/duration/excluded attempts.

**Security/ownership:** `match` accepts arbitrary request-shaped input and provider data is internal; `matchForRequest` loads any request by ID without caller context. If exposed beyond trusted internal assignment, request and candidate data can be enumerated. No tenant boundary, patient authorization, provider consent or sensitive-payload minimization is visible.

**Truthfulness/fairness:** ranking weights are hard-coded and not versioned or explained to users. Missing geo data receives a neutral 200 points when no patient location exists but only 50 when patient location exists, affecting comparability. Out-of-radius providers remain eligible with zero distance points rather than being excluded. Provider display name falls back to email, and capability price is surfaced without currency or authoritative price semantics. Score inputs may be stale from the scoring service.

**Scheduling correctness:** availability is delegated to a non-atomic scheduling engine; matching can rank a provider available immediately before a concurrent booking. No reservation/hold is created here. Multiple asynchronous capability/zone/workload calls per candidate create consistency and performance variance.

**Privacy/PII:** candidate `meta` exposes matched-item count, while display name/email and capability price are returned to callers. Request payload is passed into capability matching; no redaction or size bound is visible.

**State/transitions:** no mutation in `match`; `matchForRequest` reads request and excludes previously attempted provider IDs. Dispatch/state mutation occurs in assignment strategy.

**Price/payment/insurance source:** capability price may be returned from capability service; no currency, final-price authority, payment, insurance or ledger verification visible.

**Test implications:** require trusted-caller/tenant tests for request matching, deterministic scoring/version fixtures, missing/out-of-zone geo cases, provider status/capability/availability races, schedule reservation integration, stale-score handling, PII minimization, price provenance, max-results bounds and performance/load tests. No tests executed during this semantic read.
