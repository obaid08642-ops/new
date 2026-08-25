# Phase 0B semantic evidence — FastAPI AI service

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `infra/fastapi/ai_service.py:1–307`

`AIService` is a provider-agnostic facade around `emergentintegrations.llm.chat.LlmChat`, configured from `EMERGENT_LLM_KEY`, `AI_VISION_MODEL` and `AI_VISION_PROVIDER` (`1–15,29–37,51–86`). The provider returns raw model text and provider errors, including `str(e)`, with no visible timeout, retry budget, circuit breaker, cost/rate limit, request correlation, content retention or data-processing/consent policy (`60–86`). The service can replace its provider through a mutable setter with no authorization or lifecycle control (`92–105`).

`_clean_b64` strips only a small set of image data-URL prefixes; otherwise it accepts arbitrary input as JPEG base64, with no size, decoded-byte, dimension, MIME/content sniffing, malware or EXIF/PII control (`110–117`). `_extract_json` heuristically extracts the first balanced object/array from arbitrary model prose and has no schema validation, unknown-field rejection, bounds or safety policy (`119–144`).

Prescription OCR sends an image to an external model with instructions to extract medicine names, ingredients, dose, frequency, duration, diagnosis, doctor name and date (`149–166`). On provider success, the parsed list and clinical fields are returned with `ok: true` even when JSON parsing fails or values are missing; raw model text is returned to the caller (`166–191`). There is no physician verification, confidence minimum, medicine-catalog resolution, prescription authenticity check, patient consent, redaction, retention or safe handling of diagnosis/doctor PII (`176–190`).

Medicine image recognition similarly returns arbitrary parsed fields and raw output as a successful match, with only default values added and no confidence threshold, catalog verification, regulatory status, prescription classification or safety disclaimer (`193–226`). Barcode lookup sends the supplied code directly into a model prompt and relies on model knowledge of GS1/MENA products rather than a verified barcode/catalog source (`228–263`). It treats confidence >=0.4 as sufficient, accepts the model's `requires_prescription` classification, returns raw reasoning/output and exposes provider errors as strings (`265–302`). A low confidence result is converted to `found=false`, but no independent source verification or hard safety gate exists.

The singleton is instantiated at import time with the environment-configured provider (`305–307`), creating global mutable integration state and making configuration/health/availability implicit. The implementation has no explicit audit event, model/prompt version, source citation, grounding evidence, tenant/actor context, data minimization or per-use consent. No product code was changed, no AI provider was called and no tests/builds were run during this semantic read.
