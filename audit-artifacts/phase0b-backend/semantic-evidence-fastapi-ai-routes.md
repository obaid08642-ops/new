# Phase 0B semantic evidence — FastAPI AI routes

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `infra/fastapi/ai_routes.py:1–185`

The router exposes `/api/v2/ai` routes and documents that authenticated patients are intended but anonymous guest previews are allowed (`1–12,30`). It defines `JWT_SECRET` with a hardcoded fallback `nabd-secret-2025-change-in-prod` and decodes bearer tokens locally (`25–41`). This secret is independent from the server's required JWT secret and can permit token confusion or forgeable attribution when the environment variable is absent/misconfigured. `_decode_user` is used only for attribution; the OCR and image routes do not reject unauthenticated requests (`71–79,82–115`).

The public status endpoint returns provider name and whether the LLM key is present (`61–68`), exposing configuration state without visible authentication or information-disclosure policy. Prescription OCR accepts only a non-empty string, calls AI and attaches a possibly absent decoded user ID; it has no size/type/consent/tenant/retention or clinical PII controls at the route boundary (`71–79`). Medicine image search similarly permits anonymous calls, returns AI output, and performs best-effort catalog mapping against a fixed `http://localhost:8002/api/medicines/autocomplete` endpoint with an 8-second client and silently swallows every upstream failure (`82–115`). No canonical verified match, rate limit, query length bound, audit or error observability is visible.

Triage is a deterministic substring rule engine, not the full LLM-backed flow described in the comments (`118–154`). It accepts symptoms, age, gender and language but ignores age/gender/lang in the decision, maps a small list of substrings to specialties/urgency, defaults unknown input to internal medicine, and always returns `ok: true`. It lacks red-flag coverage, emergency routing/contacts, locale semantics, clinical validation, abuse/rate controls, structured uncertainty and versioned rule provenance; the disclaimer does not prevent callers from treating the result as medical triage.

Barcode lookup accepts any non-empty code, replaces control characters but does not validate GTIN/EAN/UPC/DataMatrix format/length, and passes the result to AI without authentication or authoritative catalog fallback (`161–184`). Errors are logged and returned through `str(e)` in a 500 response, potentially exposing internal provider details. The route does not enforce a confidence/safety policy itself, does not verify the AI classification against GS1/SFDA/catalog data, and ignores its unused authorization parameter.

This router therefore duplicates the AI surface already present in `ai_service.py` and `server.py`, with an inconsistent authentication/fallback-secret model and anonymous medical-image/triage/barcode operations. No product code was changed, no AI/upstream call was made and no tests/builds were run during this semantic read.
