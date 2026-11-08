# R19 — data residency (health data hosting in KSA)

Status: **options and plan, nothing moved.** Owner decision 21 / issue #340 (`docs/review/OWNER_DECISIONS_PENDING_2026-10-14.md`): "In-Kingdom hosting before launch. Plan the move once the licence path is known; staging first." This is that plan. The topology decision of 2026-11-02 (one bigger host, LiveKit self-hosted) stays: every option below is ONE host in the Kingdom, split later.

## What the law says (not legal advice, not verified by a lawyer)
From public summaries ([CMS](https://cms.law/en/are/legal-updates/one-year-anniversary-saudi-personal-data-protection-law), [Clyde & Co](https://www.clydeco.com/en/insights/2024/09/saudi-arabia-s-personal-data-protection-law-become), [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/saudi-arabia-regulator-invites-comments-on-the-executive-regulations-to-the-personal-data-protection-law)):
- The PDPL does **not** forbid storing personal data abroad; transfers outside the Kingdom are allowed under conditions (Article 29, SDAIA's Regulation on Personal Data Transfer outside the Kingdom, updated 1 September 2024: adequacy of the destination, other safeguards, or approval). Health data is "sensitive" and is the case the regulator watches most.
- I did **not** find a confirmed general rule that health data must be hosted in the Kingdom. Sector rules (Ministry of Health, Saudi Health Council, NDMO, CST cloud framework) may require it for a licensed health service. Their text did not come up in my search.
- Penalty for an unlawful transfer: up to one year of prison and/or a fine of about USD 260,000 (same summaries).
**So the engineering question is cheap, the legal question decides it:** ask counsel (a) is in-Kingdom hosting required for the licence we will hold, (b) which of the processors in section 2 may receive personal data, with which safeguards. Until answered, this plan keeps every option open.

## 2. Where personal data goes today (inventory from the repository)
`backend/src/common/residency-inventory.spec.ts` fails if a new outbound endpoint variable appears that is not listed here.

| Store / processor | Personal data | Where (as configured) | In the Kingdom? | How it moves |
|---|---|---|---|---|
| MongoDB (`MONGO_URL`) | everything: health fields (field-encrypted, `HEALTH_FIELDS`), identity, orders, chat | the production host (OVH, Europe; 3.8 GB, bigger host pending: `docs/ops/SERVER_MOVE.md`) | **No** | new host in the Kingdom + restore (section 4) |
| Redis (`REDIS_URL`, `REDIS_CACHE_URL`, `REDIS_HOST`) | sessions, OTP state, queues with notification payloads | same host | No | moves with the host; nothing to migrate (state is rebuildable; drain queues first) |
| Meilisearch (`MEILI_URL`) | catalogue/search index, no health data by design | same host | No | rebuild index on the new host |
| ClamAV (`CLAMD_HOST`) | uploaded files in transit | same host (container) | No | moves with the host |
| LiveKit / coturn (`LIVEKIT_URL`, `COTURN_HOST`) | live audio/video of consultations (media is relayed, not recorded) | same host, self-hosted | No | moves with the host; calls get faster for users in KSA |
| Object storage (`S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`) | uploads: report attachments, prescriptions photos, insurance documents, provider documents | Cloudflare R2 + public CDN `cdn.nabd.plus` | **No** (R2 has no Saudi location) | `S3_ENDPOINT` is generic S3: any S3-compatible store in the Kingdom works with no code change; copy objects, re-point, keep the public CDN for non-personal assets only |
| Backups (`BACKUP_S3_*`) | the whole database, gpg-encrypted (AES-256) | private R2 bucket | No (encrypted copy) | point `BACKUP_S3_*` at an in-Kingdom bucket; the passphrase stays off the bucket |
| Cloudflare edge (proxy, CDN, Worker, KV) | **all web and API traffic passes through and is decrypted at the edge**, including logins and health API responses | Cloudflare network (has Saudi points of presence, but processing is not guaranteed in-Kingdom) | **Partly / not controllable** | Decide with counsel whether TLS termination at Cloudflare is acceptable; alternative is DNS-only for `api.` and serving the API directly from the in-Kingdom host (loses WAF/DDoS, see R9). The status worker/KV hold no personal data |
| Sentry (`SENTRY_DSN`, `de.sentry.io`) | error events, scrubbed by `scrubDeep` (secrets, tokens); user id only | EU (Germany) | No | self-host or keep with counsel's approval; no health fields should reach it (spec: `secret-scrub`); confirm for each new field |
| E-mail (`MAIL_*`: `SMTP_HOST`, `SES_SMTP_HOST`, `BREVO_API_BASE`, `MAILJET_API_BASE`, Resend) | recipient address, name, order/appointment wording | provider clouds abroad | No | mail content already avoids medical detail in templates (confirm per template); or an in-Kingdom SMTP relay |
| SMS / WhatsApp (`INFOBIP_URL`, OTP provider) | phone number, OTP, template text | provider | provider-dependent | choose a CST-licensed Saudi SMS gateway if counsel requires |
| Push (FCM `fcm.googleapis.com`, `APNS_HOST`) | device token, notification text | Google / Apple | No | notification text must not carry diagnosis; today text is short and generic (confirm per template) |
| Payments (`MOYASAR_API_BASE`) | payer, amount; card data never touches us | Moyasar (Saudi, SAMA-licensed) | Yes (provider side) | none |
| Saudi Post / SCFHS (`SPL_API_URL`, `SPL_GEOCODE_URL`, `SCFHS_VERIFY_URL`) | address, practitioner licence number | Saudi government services | Yes | none |
| Geocoding (`NOMINATIM_URL`) | **addresses/coordinates typed by users**, if the public instance is used | `nominatim.openstreetmap.org` (abroad) | No | run Nominatim on the host, or use SPL geocode only (open item) |
| AI assistants (`ai-provider-catalog.ts`: gemini, openai, groq, cerebras, openrouter, deepseek, qwen/dashscope, replicate) | **free text the user types, which can be health information**, and images | each provider's cloud (US, China for deepseek/qwen) | **No** | highest risk: restrict health-flagged calls to providers counsel approves or to a self-hosted model, or disable AI for health text (kill switch `ai`); not changed here |

## 3. Options with prices
Prices are indicative, from public pages found on 2026-11-03, **not quotes**; confirm in each console before ordering. Nothing is ordered.

| Option | What | Monthly price (indicative) | Notes |
|---|---|---|---|
| **A. Stay in the EU + legal basis** | Keep OVH/Hetzner; encrypted fields (done), encrypted backups (done), SDAIA transfer route (adequacy/approval) and contracts with processors; counsel's opinion | host as planned (`SERVER_MOVE.md`), counsel fee | Fastest; only valid if counsel says the licence does not require in-Kingdom hosting. Latency to KSA users 100–150 ms (estimate) |
| **B. One VPS from a Saudi provider** (Riyadh) | everything of section 2 that is on the host, plus an in-Kingdom S3 (MinIO on the same host is enough at the start) | listings seen: Wafai Cloud 8 GB / 2 vCPU about SAR 291 ([listing](https://www.whtop.com/plans/wafaicloud.com/130723)), 4 vCPU / 4 GB SAR 490 ([listing](https://www.whtop.com/plans/wafaicloud.com/130649)); a Riyadh 4 vCPU / 8 GB plan about USD 155 on an aggregator ([listing](https://cdnhf.zhaomu.com/riyadh-cloud-server-city?page=2)); KSA Hosting 4 vCPU / 8 GB USD 159 ([listing](https://www.whtop.com/plans/ksahosting.com/130059)) | Cheapest in-Kingdom. Small local providers: check their licence (CST), uptime SLA, backups, DDoS, port/UDP policy for LiveKit (7882/udp, 40000-49999/udp), and bandwidth caps (R8). 8 GB/2 vCPU is below the 8–16 GB / more CPU the topology decision wants |
| **C. Oracle Cloud, Riyadh or Jeddah region** | a VM (flexible shape) + Object Storage (S3-compatible) in the Kingdom | OCI lists CPU and memory separately; one third-party figure is about USD 0.048 per OCPU-hour for E4 Flex plus memory ([price list](https://www.oracle.com/cloud/price-list/)); use the cost estimator with the Riyadh region for a real number | Public-cloud grade (firewall, snapshots, object storage in the same place); regions in Jeddah (2020) and Riyadh (Oct 2024) ([Arab News](https://www.arabnews.pk/node/2576267)). Egress is cheap on OCI but check the free allowance for calls |
| **D. Google Cloud Dammam** | same idea | not priced here | Region announced for 2023 ([w.media](https://w.media/googles-saudi-cloud-region-to-be-launched-shortly/)); current availability not confirmed by my search |
| **E. Hybrid (recommended to ask counsel about)** | app, database, uploads, backups and calls in the Kingdom (B or C); static public content (catalogue pages, images that hold no personal data) stays on Cloudflare | B or C plus Cloudflare Free | Keeps CDN speed for public pages while personal data stays at home. Does not solve the edge-decryption question for the API (section 2, Cloudflare row) |

**Recommendation (for the owner, pending counsel):** build the in-Kingdom environment as a **staging** first (owner decision 340), on **C or B** depending on price and licence, so the answer to "is it fast enough, do calls work" is measured before launch. Do not order production until counsel answers question (a). Option A remains the fallback and costs nothing extra.

## 4. Migration plan (no code changes required, staging first)
1. **Staging in the Kingdom** (R6 compose stack): same images, `MONGO_URL` local, `S3_ENDPOINT` to an in-Kingdom S3, seeded test data only (never copy production personal data to staging). Measure: latency from a Saudi mobile network, call quality, backup/restore time (`dr-drill.sh`).
2. **Decide with counsel** the processors in section 2: SMS, e-mail, push, Sentry, Cloudflare edge, AI, geocoding. Write the decision next to the table.
3. **Production move** follows `docs/ops/SERVER_MOVE.md` sections 4 and 9 (method B restore from the oplog slices): freeze writes, final slice, restore, DNS TTL lowered a day before, switch, keep the old host read-only for the agreed window, then destroy it and its backups per the retention table (`docs/ops/HEALTH_DATA_16.9.md`).
4. **Uploads and backups**: copy objects bucket-to-bucket (`rclone`/`aws s3 sync`, both are S3), change `S3_ENDPOINT`, keys and `S3_PUBLIC_BASE_URL`, re-point `cdn.nabd.plus` for personal files (private bucket with signed URLs; the public CDN keeps only non-personal assets), then change `BACKUP_S3_*` and run a restore drill from the new bucket.
5. **Delete abroad**: after the window, delete the R2 objects, old backups and old host disks; record the deletion (PDPL).
6. **Verify**: this document's table is re-checked; `residency-inventory.spec.ts` passes; a packet capture (or provider logs) on the new host shows no connection from the API to an unlisted foreign host for personal data.

## 5. Open items found while writing this
- **AI providers (deepseek, qwen/dashscope, groq, cerebras, openrouter, replicate, openai, gemini) can receive health text.** There is a `health` flag for the answer footer, but no routing rule that keeps health prompts away from foreign providers. Needs an owner/counsel decision; options: self-hosted model on the in-Kingdom host, an in-Kingdom provider, or disabling AI for health text.
- **Geocoding via the public Nominatim instance** sends user addresses abroad (`geo-sources.ts`). Use the SPL geocoder or a local instance.
- **Cloudflare terminates TLS for the API** (section 2).
- **Sentry host is hard-coded to `de.sentry.io` in `patient-web/next.config.ts`** (the backend DSN carries its own host).
- Backups and uploads are in R2 today (no Saudi location).
- Mail and push templates should be checked one by one for medical wording.

## 6. Not done here
No host ordered, no data moved, no code changed; prices are from public pages and listings of uncertain age; the legal position is from secondary sources and needs counsel.
