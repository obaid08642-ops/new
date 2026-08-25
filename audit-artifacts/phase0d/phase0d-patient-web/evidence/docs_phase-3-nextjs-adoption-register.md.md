# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-nextjs-adoption-register.md`
- **Member SHA-256:** `695b31e3e09abbcbca2cd36acfc199419ed745b72841e0281c4f8158cef4f4e8`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | Next.js App Router + strict TS | القالب الحالي React/Vite/Express/tRPC SPA، ولا يحقق App Router أو HTML عام SSR/ISR. | استبدال طبقة واجهة العميل بـNext.js App Router، لا محاولة تسمية SPA على أنها Next. | `tsconfig` strict، build/start Nex`
- `9: | JWT/refresh دون localStorage | دليل المصدر ينص Bearer + refresh، والقالب auth مختلف. | BFF عبر Route Handlers وcookies `httpOnly; Secure; SameSite` قصيرة الأجل؛ لا token في localStorage أو props أو URL. | 401 refresh مرة واحدة، logout fai`
- `10: | React Query | غير موجود كعقد REST للمريض. | React Query للـclient state/query cache الخاص بالمريض مع invalidation بعد mutations؛ لا cache مشترك لبيانات PII. | query keys typed، retry policy، error boundary، tests. | مخطط |`
- `13: | SSR/SSG/ISR للمحتوى العام | لا يوجد SSR في القالب؛ تحتوي البيانات الطبية/الحسابية على PII. | Server Components/ISR فقط للكيانات المنشورة viewer-independent؛ private routes client/BFF و`noindex,no-store`. | raw HTML/crawler tests وغياب PII`
- `16: | ملفات S3 | الدليل يثبت presigned/direct upload. | route/service يطلب presign ثم يرفع للـURL ويخزن key ضمن API وظيفي؛ لا base64 fallback ولا bytes في DB. | MIME/size/ownership/error/retry tests. | مخطط |`
- `19: | ASO/روابط عميقة | لا ملفات app association في القالب. | `apple-app-site-association` و`assetlinks.json` وmapping page→deep link بعد تأكيد package IDs/domains. | platform association validation، لا redirect loops. | مخطط؛ يحتاج package IDs`
- `20: | الاختبارات | Vitest موجود في القالب؛ لا Playwright حالياً. | Vitest للوحدات/contracts + Playwright لمسارات auth/booking/payment/ownership + axe/perf. | CI gates وشهادات Sandbox. | مخطط |`
- `25: يستخدم المتصفح مسارات داخل نطاق Web App مثل `/api/patient/*`، ويتحدث Next Route Handler من الخادم إلى `https://api.nabd.plus/api/v1`. يمنع ذلك كشف bearer/refresh token في JavaScript ويبقي base URL وheaders وتبديل refresh داخل boundary خادمي`
### backend_consumers_or_contracts
- `7: | Next.js App Router + strict TS | القالب الحالي React/Vite/Express/tRPC SPA، ولا يحقق App Router أو HTML عام SSR/ISR. | استبدال طبقة واجهة العميل بـNext.js App Router، لا محاولة تسمية SPA على أنها Next. | `tsconfig` strict، build/start Nex`
- `8: | طبقات services/hooks/features | استدعاءات نموذج القالب عبر tRPC، والخلفية المطلوبة REST خارج القالب. | API service adapter موحد مبني على `fetch` خادمي ومجموعة feature modules؛ لا fetch داخل view. | lint/architecture tests ومنع imports عكس`
- `17: | SSE وLiveKit | endpoints موجودة في OpenAPI بعد مطابقة البادئة. | feature gate حتى تثبت tokens/room state/authorization في Sandbox؛ لا زر مكالمة شكلي. | reconnect/denied/end/unsupported channel E2E. | مخطط |`
- `25: يستخدم المتصفح مسارات داخل نطاق Web App مثل `/api/patient/*`، ويتحدث Next Route Handler من الخادم إلى `https://api.nabd.plus/api/v1`. يمنع ذلك كشف bearer/refresh token في JavaScript ويبقي base URL وheaders وتبديل refresh داخل boundary خادمي`
### auth_ownership
- `9: | JWT/refresh دون localStorage | دليل المصدر ينص Bearer + refresh، والقالب auth مختلف. | BFF عبر Route Handlers وcookies `httpOnly; Secure; SameSite` قصيرة الأجل؛ لا token في localStorage أو props أو URL. | 401 refresh مرة واحدة، logout fai`
- `15: | CSP/headers | الدليل يذكر Helmet؛ Next لا يحتاج Helmet داخل التطبيق. | headers/CSP/permissions/referrer في `next.config` أو middleware، مع nonce عند الحاجة. | security header tests وCSP report-only قبل enforcement. | مخطط |`
- `16: | ملفات S3 | الدليل يثبت presigned/direct upload. | route/service يطلب presign ثم يرفع للـURL ويخزن key ضمن API وظيفي؛ لا base64 fallback ولا bytes في DB. | MIME/size/ownership/error/retry tests. | مخطط |`
- `17: | SSE وLiveKit | endpoints موجودة في OpenAPI بعد مطابقة البادئة. | feature gate حتى تثبت tokens/room state/authorization في Sandbox؛ لا زر مكالمة شكلي. | reconnect/denied/end/unsupported channel E2E. | مخطط |`
- `20: | الاختبارات | Vitest موجود في القالب؛ لا Playwright حالياً. | Vitest للوحدات/contracts + Playwright لمسارات auth/booking/payment/ownership + axe/perf. | CI gates وشهادات Sandbox. | مخطط |`
- `25: يستخدم المتصفح مسارات داخل نطاق Web App مثل `/api/patient/*`، ويتحدث Next Route Handler من الخادم إلى `https://api.nabd.plus/api/v1`. يمنع ذلك كشف bearer/refresh token في JavaScript ويبقي base URL وheaders وتبديل refresh داخل boundary خادمي`
### state_transitions
- `10: | React Query | غير موجود كعقد REST للمريض. | React Query للـclient state/query cache الخاص بالمريض مع invalidation بعد mutations؛ لا cache مشترك لبيانات PII. | query keys typed، retry policy، error boundary، tests. | مخطط |`
- `16: | ملفات S3 | الدليل يثبت presigned/direct upload. | route/service يطلب presign ثم يرفع للـURL ويخزن key ضمن API وظيفي؛ لا base64 fallback ولا bytes في DB. | MIME/size/ownership/error/retry tests. | مخطط |`
- `17: | SSE وLiveKit | endpoints موجودة في OpenAPI بعد مطابقة البادئة. | feature gate حتى تثبت tokens/room state/authorization في Sandbox؛ لا زر مكالمة شكلي. | reconnect/denied/end/unsupported channel E2E. | مخطط |`
### payment_insurance_relevance
- `20: | الاختبارات | Vitest موجود في القالب؛ لا Playwright حالياً. | Vitest للوحدات/contracts + Playwright لمسارات auth/booking/payment/ownership + axe/perf. | CI gates وشهادات Sandbox. | مخطط |`
### error_empty_loading_retry_cancel
- `10: | React Query | غير موجود كعقد REST للمريض. | React Query للـclient state/query cache الخاص بالمريض مع invalidation بعد mutations؛ لا cache مشترك لبيانات PII. | query keys typed، retry policy، error boundary، tests. | مخطط |`
- `16: | ملفات S3 | الدليل يثبت presigned/direct upload. | route/service يطلب presign ثم يرفع للـURL ويخزن key ضمن API وظيفي؛ لا base64 fallback ولا bytes في DB. | MIME/size/ownership/error/retry tests. | مخطط |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
