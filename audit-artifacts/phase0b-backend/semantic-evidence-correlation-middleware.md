# Phase 0B semantic evidence — CorrelationMiddleware

**Archive member:** `src/common/correlation.middleware.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–29 from the baseline archive extraction.

Lines 1–8 define a Nest middleware and HTTP logger. Lines 9–13 read `x-correlation-id` or generate a UUID, attach it to the request, and echo it as `X-Correlation-ID`. Lines 14–25 capture method, original URL, user-agent, start time, response status/content length, and duration; on response finish, the full request summary is written to logs. Lines 27–29 continue the pipeline.

**Auth/ownership:** none visible; correlation ID is request-wide and unauthenticated.

**State transitions:** request-local correlation ID; response-finish log emission.

**Price/payment/insurance source:** none visible.

**Security/truthfulness observations:** inbound correlation IDs are trusted without format/length validation and can inject control characters or create log-correlation ambiguity; original URL and user-agent are logged without visible redaction, risking query-token/PII leakage; response logs include content length but no trace of actor/tenant; logging errors and response-finish behavior are not handled here.

**Test implications:** header absence/generation, oversized/malformed/control-character IDs, URL query redaction, user-agent privacy, response finish/error paths, and log correlation across async boundaries. No tests executed during this semantic read.

**Consumer traceability:** middleware registration and downstream correlation usage will feed the dedicated route-to-consumer phase.
