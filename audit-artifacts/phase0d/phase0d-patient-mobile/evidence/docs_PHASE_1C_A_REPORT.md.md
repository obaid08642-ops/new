# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PHASE_1C_A_REPORT.md`
- **Member SHA-256:** `a4ada6057bb9659bd9af87d86fac304c8ca4a773196597dc72f1f915f9915b6f`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: ## 2. إدارة الجلسات والأجهزة (Sessions & Devices)`
- `16: - **`SessionManager`**: يدعم تسجيل الدخول من أجهزة متعددة (Multi-device)، مع تفعيل **تحديث التوكن المستمر (Refresh Token Rotation)** لمنع هجمات الاستيلاء على الجلسات (Replay Attacks).`
- `17: - **Session Versioning**: إمكانية إبطال كافة الجلسات عن بُعد للمستخدم عبر رفع رقم إصدار الجلسة.`
### state_transitions
- `3: **Status:** 🟢 **COMPLETED**`
- `10: ## 1. محرك حالة المصادقة (Auth State Machine)`
- `30: - **`AppLockService`**: خدمة تعمل في الخلفية تستمع لحالة التطبيق (`AppState`). إذا وضع المستخدم التطبيق في الخلفية لأكثر من 5 دقائق (Inactivity Timeout)، يتم قفل التطبيق تلقائياً والمطالبة بالبصمة عند العودة.`
- `38: - **عدد الأخطاء (TS Errors):** `0``
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `30: - **`AppLockService`**: خدمة تعمل في الخلفية تستمع لحالة التطبيق (`AppState`). إذا وضع المستخدم التطبيق في الخلفية لأكثر من 5 دقائق (Inactivity Timeout)، يتم قفل التطبيق تلقائياً والمطالبة بالبصمة عند العودة.`
- `38: - **عدد الأخطاء (TS Errors):** `0``

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
