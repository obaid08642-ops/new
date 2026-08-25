# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-7-premium-ui-security-gate.md`
- **Member SHA-256:** `883701b5bff10825cff416ea9bfb86b694685a407d530fdcfd45c9d734623e0f`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: | الجلسة والتوكن | لم تتغير cookies `httpOnly` أو استدعاءات BFF. نموذج الدخول يرسل الاعتماد إلى `/api/auth/login` فقط ولا يثبت حسابات Sandbox أو كلمات مرور في HTML. | اختبار `tests/login-form.test.tsx`. |`
- `15: | BFF المتاح للمتصفح | بوابة `/api/patient/[...path]` تقبل قراءات `GET` للطلبات الموثقة المدرجة فقط؛ ترفض أي كتابة أو مورد غير مدرج قبل قراءة الجلسة أو تجديدها. | `lib/api/patient-allowlist.ts` واختبارات route الخاصة بالبوابة. |`
### backend_consumers_or_contracts
- `9: | الجلسة والتوكن | لم تتغير cookies `httpOnly` أو استدعاءات BFF. نموذج الدخول يرسل الاعتماد إلى `/api/auth/login` فقط ولا يثبت حسابات Sandbox أو كلمات مرور في HTML. | اختبار `tests/login-form.test.tsx`. |`
- `15: | BFF المتاح للمتصفح | بوابة `/api/patient/[...path]` تقبل قراءات `GET` للطلبات الموثقة المدرجة فقط؛ ترفض أي كتابة أو مورد غير مدرج قبل قراءة الجلسة أو تجديدها. | `lib/api/patient-allowlist.ts` واختبارات route الخاصة بالبوابة. |`
- `16: | تعذر الخلفية | أي فشل اتصال من BFF يعاد كـ`503 upstream_unavailable` بلا استثناء غير معالج أو حمولة حساسة؛ لا تتحول المهلة إلى نجاح أو قائمة بديلة. | `lib/api/upstream.test.ts` و`app/[locale]/health/health-ssr.test.ts`. |`
### auth_ownership
- `5: يغطي هذا التدقيق إعادة تصميم صفحات الدخول والقوائم والتفاصيل، ونظام الحركة، وطبقة metadata العامة. لا يغير أي عقد BFF أو سياسة cookie أو عملية API، ولا ينشئ بيانات مريض أو محتوى طبي بديلاً.`
- `9: | الجلسة والتوكن | لم تتغير cookies `httpOnly` أو استدعاءات BFF. نموذج الدخول يرسل الاعتماد إلى `/api/auth/login` فقط ولا يثبت حسابات Sandbox أو كلمات مرور في HTML. | اختبار `tests/login-form.test.tsx`. |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
