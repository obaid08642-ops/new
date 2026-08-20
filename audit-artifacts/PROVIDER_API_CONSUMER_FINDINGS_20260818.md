# Provider API consumer findings

استخراج `PROVIDER_API_CONSUMER_CALLS_20260818.txt` يثبت أن Provider App لا يقتصر على queue. توجد مستهلكات للتسجيل، ملف المزود، onboarding، dashboard، notifications، wallet/ledger، jobs، appointments، pharmacy، laboratory، radiology، nursing/home-care، facility، ambulance fleet، referrals، CRM، promotions، AI copilot، emergency، والاتصالات.

## عناصر يجب عدم عدّها PASS قبل مواءمة إضافية

| Consumer | Observation | QA treatment |
|---|---|---|
| Radiology report upload | الشاشة ترسل `pdf_url` مبنياً من `https://storage.nabdah.com/reports/` مع `order.id` | يجب إثبات أن URL حقيقي ومصرح به ومطابق storage contract؛ لا يُحسب التقرير منشوراً بمجرد نجاح toast |
| Blueprint screens | توجد استدعاءات promotions/CRM/emergency وcopilot ضمن ملف Blueprint | يجب تصنيف كل شاشة كـ live contract أو fail-closed أو غير مفعلة؛ لا تُفعّل emergency أو AI actions دون عقد واعتماد |
| Emergency | consumer يستدعي `/emergency/trigger`, claim, track | يبقى fail-closed حتى اعتماد سياسة الموقع وسجل التدقيق؛ الاختبار المتوقع رفض آمن فقط |
| Lab samples | consumer يغيّر مراحل العينة عبر `/labs/samples/:id/stage` | يلزم sandbox sample حقيقي وownership/provider-type verification قبل mutation |
| Ambulance fleet | availability/delete/mutation | يلزم مزود ambulance sandbox منفصل أو يصنّف BLOCKED؛ لا ينشأ fleet وهمي في الإنتاج |
| Wallet ledger | `/provider/ops/wallet/ledger` | قراءة فقط أولاً، ثم payout لا يُنفذ إلا مع رصيد sandbox فعلي وIBAN sandbox معتمد |

الحكم الحالي: **route consumer inventory complete, live lifecycle not complete**. أي شاشة تعرض نجاحاً محلياً بلا response state أو تستخدم storage URL ثابتاً ستبقى مفتوحة حتى إثبات backend/storage/DB/notification chain.
