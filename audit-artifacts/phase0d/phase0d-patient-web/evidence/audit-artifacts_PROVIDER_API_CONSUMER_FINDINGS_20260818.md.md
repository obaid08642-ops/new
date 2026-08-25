# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_API_CONSUMER_FINDINGS_20260818.md`
- **Member SHA-256:** `c57775a9ce8e0e5367bce7a135c8e3dce5ae5ff9e0827f2396910576a1f08bcb`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: | Radiology report upload | الشاشة ترسل `pdf_url` مبنياً من `https://storage.nabdah.com/reports/` مع `order.id` | يجب إثبات أن URL حقيقي ومصرح به ومطابق storage contract؛ لا يُحسب التقرير منشوراً بمجرد نجاح toast |`
- `10: | Blueprint screens | توجد استدعاءات promotions/CRM/emergency وcopilot ضمن ملف Blueprint | يجب تصنيف كل شاشة كـ live contract أو fail-closed أو غير مفعلة؛ لا تُفعّل emergency أو AI actions دون عقد واعتماد |`
- `16: الحكم الحالي: **route consumer inventory complete, live lifecycle not complete**. أي شاشة تعرض نجاحاً محلياً بلا response state أو تستخدم storage URL ثابتاً ستبقى مفتوحة حتى إثبات backend/storage/DB/notification chain.`
### backend_consumers_or_contracts
- `3: استخراج `PROVIDER_API_CONSUMER_CALLS_20260818.txt` يثبت أن Provider App لا يقتصر على queue. توجد مستهلكات للتسجيل، ملف المزود، onboarding، dashboard، notifications، wallet/ledger، jobs، appointments، pharmacy، laboratory، radiology، nursing`
- `12: | Lab samples | consumer يغيّر مراحل العينة عبر `/labs/samples/:id/stage` | يلزم sandbox sample حقيقي وownership/provider-type verification قبل mutation |`
- `14: | Wallet ledger | `/provider/ops/wallet/ledger` | قراءة فقط أولاً، ثم payout لا يُنفذ إلا مع رصيد sandbox فعلي وIBAN sandbox معتمد |`
### auth_ownership
- `12: | Lab samples | consumer يغيّر مراحل العينة عبر `/labs/samples/:id/stage` | يلزم sandbox sample حقيقي وownership/provider-type verification قبل mutation |`
### state_transitions
- `16: الحكم الحالي: **route consumer inventory complete, live lifecycle not complete**. أي شاشة تعرض نجاحاً محلياً بلا response state أو تستخدم storage URL ثابتاً ستبقى مفتوحة حتى إثبات backend/storage/DB/notification chain.`
### payment_insurance_relevance
- `3: استخراج `PROVIDER_API_CONSUMER_CALLS_20260818.txt` يثبت أن Provider App لا يقتصر على queue. توجد مستهلكات للتسجيل، ملف المزود، onboarding، dashboard، notifications، wallet/ledger، jobs، appointments، pharmacy، laboratory، radiology، nursing`
- `14: | Wallet ledger | `/provider/ops/wallet/ledger` | قراءة فقط أولاً، ثم payout لا يُنفذ إلا مع رصيد sandbox فعلي وIBAN sandbox معتمد |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
