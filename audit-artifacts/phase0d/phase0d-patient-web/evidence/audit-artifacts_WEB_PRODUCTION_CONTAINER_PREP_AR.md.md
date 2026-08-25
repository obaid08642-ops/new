# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_PRODUCTION_CONTAINER_PREP_AR.md`
- **Member SHA-256:** `1fb6f3e52df174e0f088ef23b200363c4ca6a76c3d2a7d2ee6ef83ae7db149e5`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `36: يجب تزويد container runtime بـ`NABD_API_BASE_URL=https://api.nabd.plus/api/v1` و`NEXT_PUBLIC_SITE_ORIGIN=https://nabd.plus`، ثم تمرير `PORT=3000` وhealth/readiness probe مناسب للتطبيق. لا يتم وضع `NABD_API_BASE_URL` في `NEXT_PUBLIC_*` ولا ت`
### auth_ownership
- `13: | Variable | Role | Secret? |`
- `21: لا توجد أسرار أو passwords أو tokens في المثال. يجب إنشاء `.env.production` على منصة النشر من secret manager، وليس من Git.`
- `38: يجب تنفيذ `docker build` و`docker run` في CI أو منصة النشر الفعلية، ثم smoke test للصفحات العامة وBFF بدون تسجيل session token في HTML أو URL. هذه الخطوة لم تُنفذ في sandbox لغياب Docker daemon، لذلك الحكم هو **container-prepared, deploymen`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `9: أُضيف `.dockerignore` لمنع `.env` و`.env.*` و`.next` و`node_modules` و`.git` وملفات logs/coverage من build context. لا يحتوي image على production env values؛ يتم حقنها من deployment platform وقت التشغيل.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
