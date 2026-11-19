# Data flow: where personal and health data goes (Phase 1, read-only)

Evidence from `backend/src`; hosting locations are from `docs/platform/R19-data-residency.md` and the research note (production host is in Europe today; R19 plans in-Kingdom).

| sink | what goes in | evidence | residency issue | multi-country rule |
|---|---|---|---|---|
| MongoDB | all 209 collections (`data-classification.md`); health fields encrypted (`scripts/encrypt-health-fields.ts`, `common/pdpl-compliance.module`) | `schemas/*` | health/personal data must be able to live in an in-country cell | Regional class stays in the cell of the patient's market; Global/Market reference replicated |
| Files / object storage | profile images, medical reports, prescriptions, documents, attachments | `modules/media/media.service.ts:17-20` (S3-compatible, Cloudflare R2), `modules/storage/storage.module.ts:21`, Cloudinary (`scripts/cloudinary-orphans.ts`, `res.cloudinary.com` allow-list `maternity/pregnancy-weeks.dto.ts:5`) | R2/Cloudinary are outside the Kingdom (R19) | bucket per cell; no health files in global CDN; images public only |
| Redis | sessions, rate limits, OTP/abuse counters, locks, idempotency, nominatim slot (`geo/geo-sources.ts:64`), queues | `modules/redis/redis.service.ts:2,6,16` | keys hold phone-derived data (`common/otp-abuse.service.ts:47`) | Redis per cell; keys prefixed by market |
| Queues (BullMQ) | jobs for notifications, orders, finance | `admin/enterprise/admin-ops.controller.ts:10` | payloads may contain PII | per-cell queues; payload minimisation |
| Events / outbox | `system_events`, `event_dlq`, `event_delivery_log` | `modules/events/system-event.schema.ts:9`, `event-reliability/event-reliability.module.ts:21,34` | event bodies carry order/patient ids | event envelope gets `market_id` + `region`; no cross-cell fan-out |
| Sockets / realtime | chat, presence, order updates | `modules/realtime`, `chat`, `presence` | live messages | gateway per cell |
| Logs | structured logs with PII masking (`maskPii`) | `common/structured-logger`, `modules/observability/observability.spec.ts:122-123`, `modules/logs/app-logs.store.ts`, admin logs | logs shipped to external stores? (confirm in ops) | masking stays mandatory; per-cell log store |
| Sentry | server errors 500+ only, scrubbed (`scrubDeep`) | `instrument.ts:7-23`; patient-web `instrumentation-client.ts` | Sentry EU (R19) | scrub rules per market; DSN per cell if law requires |
| AI providers | assistant prompts/answers, content review, search intent | `modules/ai/env-chain.ts:72-86` (gemini/openai/openrouter/groq), `ai-gateway.service.ts:554`, `schemas/extra.schemas.ts:80` `ai_interactions` | health text leaves the country | AI plugin per market: allowed providers list, redaction, deny by default for health text |
| Email | OTP, invoices, alerts, receipts | `modules/mail/mail.module.ts:25,32,342` (Resend/Brevo/Mailjet/SMTP) | processor abroad | allowed processors per market |
| SMS | none (owner decision 2026-10-25) | `auth/auth.service.ts:459` | n/a | keep off; plugin ready if a market needs it |
| Push | tokens + titles/bodies | `modules/push/push.module.ts:43,142,282` (FCM/APNs/WebPush) | message text may include health hints | generic push text; no PHI in body |
| Maps / geocoding | addresses, coordinates | `geo/geo-sources.ts:62,95` (public Nominatim), clients' map screens | addresses sent to third party | per-market geocoder plugin, self-hosted where required |
| Video | audio/video via LiveKit + coturn | `modules/livekit`, `modules/coturn`, `patient-web/lib/consult/livekit-url.ts:8` | media relays abroad | LiveKit/TURN per cell; no recording by default |
| Payments | card data goes to gateway; ids/amounts to DB | `payments/payments.module.ts:114,146`, `moyasar/moyasar.module.ts:44` | gateway per market | webhooks routed per gateway; no PAN stored |
| Search / SEO | public provider/product pages; llms.txt feeds | `patient-web/app/llms-full`, `lib/merchant-feed.ts` | public only | per-market feeds; no PII |
| Analytics / RUM | web vitals, events | `modules/rum`, `modules/analytics`, `common` | user ids? | confirm in Phase 2 |
| Backups | DB backups encrypted | `scripts/backup-encryption.spec.ts` | backup location | backups stay in the cell's region |
| Admin exports | Excel/PDF with PII | `legal/legal-enterprise.service.ts:207`, `modules/export` | admin outside country | export gated by market scope + audit |

Gaps to verify in Phase 2: analytics/RUM payload, log shipping destination, backup location, all third-party hosts (extend `residency-inventory.spec.ts` per cell).
