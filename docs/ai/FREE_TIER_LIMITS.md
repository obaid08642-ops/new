# AI providers on free plans: limits and routing

Owner decision 2026-10-26: every AI key is on a **free plan**, and every AI feature must keep working on free tiers only.

## Routing (backend/src/modules/ai/ai-gateway.service.ts)

| Request | Chain |
|---|---|
| **Vision** (prescription OCR, insurance card OCR, medicine box/photo, any image input) | only providers with a vision model, by priority (Gemini, Groq vision, OpenRouter, Qwen-VL) |
| **Text** (assistant, symptom helper, translation, classification, search helpers) | providers **without** `reserve_for_vision` first (DeepSeek, OpenRouter, Cerebras, Groq, OpenCode ...), then the reserved ones (Gemini, Qwen) as a last resort, so their quota is kept for images |

Replicate is not a chat provider (predictions API): it is registered for its key and quota but never joins a chain.

A provider is **left out** of a request's chain when: `disabled`, `no_key`, `no_vision` (vision request), `not_chat`, a used-up window (`quota_day`, `tokens_day`, `quota_month`, `tokens_month`), `rpm` (the minute window), or `parked`. Every request writes to `ai_usage`: `served_by`, `skipped: [{provider, reason}]`, `failed: [{provider, code}]`.

## What a failure does

| Failure | Effect on the provider |
|---|---|
| 401 / 403 | parked 30 minutes; `needs_attention` is set (admin AI page) and an error is logged; cleared by a new key or a good call |
| 429 | parked for the wait the provider sent (`Retry-After`; Groq `x-ratelimit-reset-requests`; an epoch in `X-RateLimit-Reset`), else 5 minutes |
| 5xx / timeout / network | counted; parked 5 minutes after **2 in a row** |
| empty reply, other | nothing; the request moves on |

The request always falls to the next provider. Windows are counted per provider in its own timezone (`reset_tz`): the day (`used_today`, `tokens_used_today`), the month (`month_requests`, `month_tokens`) and the minute (Redis key per minute).

## Free-tier facts read from the official documentation (2026-10-26)

Read through a page summary, not verbatim. **Re-check a number before relying on it.** `limits_verified` is true only where the numbers were on the official page.

| Provider | Facts | Source |
|---|---|---|
| Gemini | Daily quota resets at midnight Pacific. The per-model free limits (RPM/RPD/TPM) are **not on the page**: they are shown in AI Studio. The pricing page lists which models are free (2.5 Flash, 3.x Flash and Flash-Lite ...) and `gemini-2.0-flash` is **not** in that list: check the model in the admin. 429 is `RESOURCE_EXHAUSTED`, no Retry-After documented. | https://ai.google.dev/gemini-api/docs/rate-limits , /pricing |
| Groq | Limits are shown only in console.groq.com/settings/limits. 429 sends `retry-after` (seconds) and `x-ratelimit-reset-requests` (e.g. `2m59.56s`). The daily reset time is not stated (UTC assumed). The models page does not list `llama-4-scout`: check the vision model in the admin. | https://console.groq.com/docs/rate-limits |
| OpenRouter | `:free` models: 20 requests/minute, 50/day with under 10 credits bought, 1000/day with at least 10. Day = UTC day. 429 carries `X-RateLimit-*` (format not stated) and sometimes `Retry-After`. Which free models take images is not on the page. | https://openrouter.ai/docs/api-reference/limits |
| Cerebras | Free trial: 5 requests/minute and 1M tokens/day (gpt-oss-120b, qwen-3.8-27b). No requests-per-day figure. Capacity replenishes continuously (UTC day used as an approximation). The seeded model `llama-4-scout-17b-16e-instruct` is **not** in the page's table: check the model. `qwen-3.8-27b` accepts images (image limits are listed). | https://inference-docs.cerebras.ai/support/rate-limits |
| DeepSeek | No free tier stated. Concurrency limits (HTTP 429 when exceeded), no RPM/TPM. | https://api-docs.deepseek.com/quick_start/rate_limit |
| Qwen (Alibaba Model Studio) | One-time free quota per model (typically 1M tokens), valid 90 days from activation: not a monthly allowance. Amounts for qwen-plus / qwen-vl-plus not stated. | https://www.alibabacloud.com/help/en/model-studio/new-free-quota |
| OpenCode Zen | Pay-as-you-go. "Free-tier chat models require OpenCode; use paid models or Go from other clients": no free usage from our backend. Rate limits not stated. | https://opencode.ai/docs/zen |
| Replicate | No free tier. 429 body: `Request was throttled. Your rate limit resets in ~30s.` | https://replicate.com/docs/topics/predictions/rate-limits |

Numbers that were **not** published (Gemini, Groq, DeepSeek, Qwen, OpenCode) keep conservative defaults in the seed and are flagged `limits_verified: false` in the admin: an admin should copy the real values from each console (editable per provider).
