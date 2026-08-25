# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE15_REVIEWER_DEPLOYMENT_CANDIDATE_20260819.md`
- **Member SHA-256:** `85f96ed2c1dac11eb77585a5747aa992d8503203f0cf1fe180b5fbf24de2592e`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `49: | smoke read-only | health/liveness/readiness وauth-boundary ووسائط Media route فقط، بلا بيانات مرضى أو دفع أو إنشاء سجلات. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: > يقتصر الفرق على أدلة التدقيق وسجل `todo.md` وأرشيف Provider/Backend الحاكمين. لا يتضمن secrets أو JWT أو OTP أو بيانات مرضى أو تقارير صحية أو نشرًا إلى الخادم.`
- `24: | `web_admin_dashboard.zip` | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | PASS |`
- `35: | Admin | PASS: `npm ci --ignore-scripts` | لا suite معرفة | PASS: Next production build | 0 production vulnerabilities | **BLOCKED**: `npm run lint` يفشل بـ230 errors و34 warnings |`
- `59: | Owner/Product/Legal | اعتماد Moyasar، النصوص والعقود القانونية، SOS/QR/consent/location، وسياسة AI/PHI. |`
### state_transitions
- `35: | Admin | PASS: `npm ci --ignore-scripts` | لا suite معرفة | PASS: Next production build | 0 production vulnerabilities | **BLOCKED**: `npm run lint` يفشل بـ230 errors و34 warnings |`
- `50: | BOLA/E2E | حسابات Sandbox منفصلة للمريض/المزود/الصيدلية/الإدارة، وIDs مولدة للاختبار، مع تسجيل status/IDs/state/cleanup دون PII. |`
### payment_insurance_relevance
- `26: لا تحتوي الأرشيفات المعاد بناؤها على `node_modules` أو مخرجات `dist` أو `coverage` أو `.expo`.`
- `37: تحذيرات الاختبارات المعلنة، ومنها S3 غير المهيأ في fixtures وMoyasar webhook secret غير مضبوط، لا تعد نجاحًا تشغيليًا. واجهاتها تبقى fail-closed ولا يطلب هذا المرشح إعداد أي secret هنا.`
- `59: | Owner/Product/Legal | اعتماد Moyasar، النصوص والعقود القانونية، SOS/QR/consent/location، وسياسة AI/PHI. |`
### error_empty_loading_retry_cancel
- `35: | Admin | PASS: `npm ci --ignore-scripts` | لا suite معرفة | PASS: Next production build | 0 production vulnerabilities | **BLOCKED**: `npm run lint` يفشل بـ230 errors و34 warnings |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
