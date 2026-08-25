# Phase 0B semantic evidence — AI

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/ai/ai.controller.ts:2–168`
- `src/modules/ai/ai.service.ts:2–337`
- `src/modules/ai/ai-provider.service.ts:2–250`
- `src/modules/ai/ai-gateway.service.ts:2–286`
- `src/modules/ai/ai.module.ts:2–10`

`ai.controller.ts:9–88` exposes admin config plus triage/history, voice order and prescription OCR; most bodies are raw/inline typed and non-admin AI mutations have no visible idempotency. `:90–168` exposes parse-excel, copilot, OCR translation, skin/medicine/barcode/meal analysis and diet/exercise plans under JWT only; several clinical/AI routes do not visibly bind to an owner. `analyze-report` is explicitly unavailable and triage/skin service logic avoids diagnosis.

`ai.service.ts:30–68` has strict helpers for text, selected enums and patient identity in triage/skin. `:89–132` computes triage care level from explicit red flags and stores patient history. `:134–216` sends raw transcript/files/base64 to the AI gateway and returns empty/Unknown fallbacks on parse/provider failure for voice/OCR/medicine/barcode/diet/exercise, while meal analysis fails truthfully. `:224–257` implements structured skin self-check and stores patient record. Other routes generate free-form clinical/nutrition outputs without persisted provenance or explicit clinician review.

`ai-provider.service.ts:64–190` resolves an env/featureflag provider, falls back across configured providers and logs usage/errors. `:193–250` sends prompts and base64 images to external provider APIs; provider/model choice is runtime. `ai-gateway.service.ts:24–123` seeds `ai_providers` with API keys into MongoDB and DB-backed mode/pinning; `:129–176` chooses quota-aware providers and automatically falls back. `:220–286` increments quotas and records usage best-effort, while admin updateProvider/setMode methods are implemented. `ai.module.ts:5–10` wires controller/service/gateway; the separate AiProviderService is not wired here.

## Findings candidates

The read supports: AI route owner/auth gaps, raw PHI/file/prompt handling, fabricated/ambiguous Unknown/empty fallbacks, provider key storage in DB, automatic cross-provider data routing, non-atomic quota/usage semantics, unbounded admin config patching, and admin gateway implementation/controller block drift.

No product code was changed and no tests/builds were executed during this semantic read.
