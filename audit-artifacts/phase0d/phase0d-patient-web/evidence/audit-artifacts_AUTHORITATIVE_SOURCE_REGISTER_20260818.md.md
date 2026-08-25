# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/AUTHORITATIVE_SOURCE_REGISTER_20260818.md`
- **Member SHA-256:** `852333eb330c65798a4f3525b89a01e57ed0d9e2b4301a4802b51d9fa89d72f2`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `45: | Admin Dashboard | remediation ناقص؛ snapshot الكامل `nabdah-live-extracted/admin-app/web-admin` يحوي 691 ملفاً | لا اعتماد قبل مقارنة الأرشيف الكامل والـhash والـroutes |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `16: | Admin Dashboard | `/home/ubuntu/nabdah-remediation/admin-dashboard` و`admin-build-work/web-admin` عند الحاجة | `Napd-admin-dashboard.zip` | يلزم inventory ومقارنة hash قبل اعتماد النسخة |`
- `39: أظهرت المقارنة أن مجلدات remediation الحالية ليست متكافئة: Patient remediation يحتوي 51 ملفاً فقط مقابل 613–627 ملفاً في snapshots الكاملة، وAdmin remediation يحتوي 11 ملفاً فقط مقابل 691 ملفاً في snapshot `nabdah-live-extracted/admin-app/w`
- `45: | Admin Dashboard | remediation ناقص؛ snapshot الكامل `nabdah-live-extracted/admin-app/web-admin` يحوي 691 ملفاً | لا اعتماد قبل مقارنة الأرشيف الكامل والـhash والـroutes |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `26: تُستخدم حسابات sandbox فقط. لكل mutation يجب تسجيل الحالة قبلها وبعدها، ومعرفات الكيانات، والاستجابة، والتنظيف أو سبب إبقاء البيانات. لا يُستخدم mock أو fallback لإثبات جاهزية مسار حقيقي. الدفع الحي يبقى محجوباً بعقد `502 payment_gateway_un`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
