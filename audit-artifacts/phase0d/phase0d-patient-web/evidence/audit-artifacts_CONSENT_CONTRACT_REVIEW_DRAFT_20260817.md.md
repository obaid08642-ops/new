# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/CONSENT_CONTRACT_REVIEW_DRAFT_20260817.md`
- **Member SHA-256:** `95c46c7b1d81ca77812c8b45fd85f325f7fdced300638cb828c04b6db4974b20`
- **Line count:** 61
- **Read range:** `1-61`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: يجب أن تكون الموافقة محددة الغرض، محددة النطاق، قابلة للسحب بسهولة، قابلة للتدقيق، ومحدودة زمنياً عند الحاجة. غياب الموافقة، غموض scope، أو اختلاف owner/subject يؤدي إلى الرفض. لا يجوز اعتبار تسجيل الدخول أو حجز الموعد موافقة ضمنية على مشار`
- `18: | `actor_role` | enum | patient، guardian، provider، admin، system؛ لا تكفي القيمة وحدها دون authorization |`
- `20: | `purpose` | enum | غرض محدد، لا free text يؤثر في authorization |`
- `26: | `source` | enum | patient_app، provider_app، admin، api |`
- `42: | `check` | لا تمنح bypass؛ المسارات الحالية تعتمد authorization القائم حتى اعتماد العقد |`
- `51: السحب أسهل من المنح: يستطيع subject سحب موافقته دون اشتراط موافقة المزود. revoke لا يحذف السجل؛ ينشئ حدثاً immutable ويجعل الحالة الحالية `revoked`. يجب أن تُبطل cache وtokens المشتقة من consent ضمن حد زمني محدد في العقد النهائي.`
- `55: كل grant أو revoke أو رفض authorization يسجل `event_id`, `consent_id`, `subject_id`, `actor_id`, `action`, `scope`, `purpose`, `result`, `reason_code`, `request_id`, `ip_hash` أو بديله المعتمد، `user_agent_hash`، timestamps، وpolicy/version`
### state_transitions
- `21: | `status` | enum | `granted` أو `revoked` أو `expired` |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
