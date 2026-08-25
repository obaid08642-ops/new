# Phase 0B semantic evidence — Central business rules engine

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/business-rules/business-rules.module.ts:2–187`

The module presents itself as the central rules engine for pricing, insurance, eligibility and provider acceptance (`business-rules.module.ts:2–7`). Rule context is caller-provided and includes patient demographics, insurance policy/eligible services, service price/limits, provider capabilities, location, payment method and service context (`17–27`). Surge configuration is mutable in process memory through an authenticated POST route, with no visible admin role, persistence, version, audit or bounded config validation (`41–48,167–178`).

Insurance validation only checks provider accepted-insurance and turns service-not-in-eligible-list into a warning rather than a rejection; no policy number/coverage verification or payer authority is visible (`50–67`). Eligibility checks age/sex only when both service and patient fields are supplied, so missing context can fail open (`69–81`). Provider acceptance warns when capability is not listed and accepts missing provider/type context; hydration by `user_id` pulls a profile without visible tenant/version or status/licence checks (`83–98,142–163`).

Pricing trusts caller-supplied service price, applies hard-coded 15% VAT, a simplified flat 80% insurance discount, and a surge multiplier based on JavaScript local hour with an inclusive end boundary; there is no currency, quote expiry, tax jurisdiction/source, rounding policy or persisted rule version (`100–122`). Payment method rules reject some contexts but allow missing context/method and are not visibly bound to a payment provider or settlement contract (`124–139`). The validate endpoint accepts raw context and returns errors/warnings/meta without authorization of caller purpose or audit; no visible idempotency is relevant for the read-like operation but config mutation lacks it (`167–179`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: mutable unaudited in-memory pricing policy, client-controlled service price/demographics/insurance context, fail-open warnings/missing fields, oversimplified coverage/VAT/surge calculations, local-time errors and lack of versioned quote truth.
