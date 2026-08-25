# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE19_RERUN_STATUS_AND_EXECUTABLE_BLOCKERS_20260820.md`
- **Member SHA-256:** `ccad8b2c1fb1b235f3cb39c32ee9820f436c96f27962d32ad45891e97e0b98d9`
- **Line count:** 53
- **Read range:** `1-53`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |`
- `41: | `nabdah-provider.zip` | `d81fbd14c1d9daedee18fd17679898b1f6ef06dd4c67810206fe14ee502b70e5` | `eas.json` محايد لتطبيق Provider؛ لا signing أو submit |`
- `49: [1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "نتائج Phase 16 الحية"`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |`
- `13: | تقرير المختبر المخبأ | PASS حي: owner 200 وforeign 404 |`
- `34: | Admin 2FA وprovider intake fixtures | يلزم step-up/OTP مفوض وfixtures معزولة لاستخدامها وتنظيفها |`
- `53: [5]: `NABDAH_OWNER_REVIEWER_NEXT_ACTIONS_20260820.md` "حزمة التنفيذ للمالك والمراجع"`
### state_transitions
- `12: | cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |`
### payment_insurance_relevance
- `12: | cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |`
- `33: | Moyasar والعقود الحساسة | يلزم activation test-safe وموافقة مكتوبة قبل أي payment/consent/location/SOS/AI/PHI test |`
### error_empty_loading_retry_cancel
- `12: | cash auto-confirm للاستشارة | PASS حي: 201 و`CONFIRMED`، BOLA owner 200/foreign 403، ثم cancel 200 |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
