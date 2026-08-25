# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/llm.ts`
- **Member SHA-256:** `30d3f1c62a9fbbb4cdba6cb91e1580213dae53fb3d404b5bdd1d41cb6f1d5096`
- **Line count:** 454
- **Read range:** `1-454`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `271: const RETRY_MAX_RETRIES = 4;`
- `272: const RETRY_BASE_DELAY_MS = 500;`
- `273: const RETRY_MAX_DELAY_MS = 30_000;`
- `280: const parseRetryAfter = (value: string | null): number | undefined => {`
- `293: retryAfterMs?: number`
- `295: const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);`
- `297: return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);`
- `308: for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {`
- `311: if (response.ok || attempt === RETRY_MAX_RETRIES) {`
- `315: const retryAfterMs = parseRetryAfter(`
- `316: response.headers.get("retry-after")`
- `319: await response.body?.cancel();`
### backend_consumers_or_contracts
- `310: const response = await fetch(url, init);`
### auth_ownership
- `3: export type Role = "system" | "user" | "assistant" | "tool" | "function";`
- `29: role: Role;`
- `63: maxTokens?: number;`
- `64: max_tokens?: number;`
- `90: role: Role;`
- `97: prompt_tokens: number;`
- `98: completion_tokens: number;`
- `99: total_tokens: number;`
- `143: const { role, name, tool_call_id } = message;`
- `145: if (role === "tool" || role === "function") {`
- `151: role,`
- `163: role,`
### state_transitions
- `139: throw new Error("Unsupported message content part");`
- `188: throw new Error(`
- `194: throw new Error(`
- `222: throw new Error("OPENAI_API_KEY is not configured");`
- `247: throw new Error(`
- `258: throw new Error("outputSchema requires both name and schema");`
- `271: const RETRY_MAX_RETRIES = 4;`
- `272: const RETRY_BASE_DELAY_MS = 500;`
- `273: const RETRY_MAX_DELAY_MS = 30_000;`
- `280: const parseRetryAfter = (value: string | null): number | undefined => {`
- `290: // upstream while it keeps returning errors.`
- `293: retryAfterMs?: number`
### payment_insurance_relevance
- `99: total_tokens: number;`
- `361: const payload: Record<string, unknown> = {`
- `366: payload.model = model;`
- `370: payload.tools = tools;`
- `378: payload.tool_choice = normalizedToolChoice;`
- `383: payload.max_tokens = resolvedMaxTokens;`
- `387: payload.thinking = thinking;`
- `390: payload.reasoning = reasoning;`
- `401: payload.response_format = normalizedResponseFormat;`
- `410: body: JSON.stringify(payload),`
### error_empty_loading_retry_cancel
- `139: throw new Error("Unsupported message content part");`
- `188: throw new Error(`
- `194: throw new Error(`
- `222: throw new Error("OPENAI_API_KEY is not configured");`
- `247: throw new Error(`
- `258: throw new Error("outputSchema requires both name and schema");`
- `271: const RETRY_MAX_RETRIES = 4;`
- `272: const RETRY_BASE_DELAY_MS = 500;`
- `273: const RETRY_MAX_DELAY_MS = 30_000;`
- `278: new Promise<void>(resolve => setTimeout(resolve, ms));`
- `280: const parseRetryAfter = (value: string | null): number | undefined => {`
- `290: // upstream while it keeps returning errors.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
