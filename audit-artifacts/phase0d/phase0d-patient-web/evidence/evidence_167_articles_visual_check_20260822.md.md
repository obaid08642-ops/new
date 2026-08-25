# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/167_articles_visual_check_20260822.md`
- **Member SHA-256:** `ac59e93e9168a9dd6985629fc6f7bc07275d488c0c152cbb636ccc04a7f2f27c`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: تظهر قائمة المقالات المنشورة بشكل متسق ومقروء مع البحث والفلاتر. لا يمثل التحقق محلياً نشر إنتاجي. لقطة المصدر محفوظة في `/home/ubuntu/screenshots/localhost_2026-08-22_01-35-32_6072.webp`.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
