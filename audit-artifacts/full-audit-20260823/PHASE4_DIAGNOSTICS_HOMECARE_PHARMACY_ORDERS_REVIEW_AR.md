# Phase 4 — Diagnostics وHome-care وPharmacy وOrders

## الحكم المرحلي

**Contract inventory PASS؛ feature closure جزئي ومشروط.** تم التحقق من method/path للعقود الحية، ومراجعة صفحات Web الحالية مقابل Mobile. لم تتم إضافة routes غير مثبتة، ولم تُستخدم بيانات mock.

## الأدلة الحية دون جلسة

| Endpoint | Status | القراءة الصحيحة |
|---|---:|---|
| `GET /labs/services` | 200 | قائمة التحاليل العامة حية |
| `GET /labs/packages` | 200 | قائمة الحزم حية |
| `GET /labs/bookings/mine` | 401 | مسار مملوك للمريض ومحمي |
| `GET /radiology/services` | 200 | قائمة الأشعة حية |
| `GET /radiology/modalities` | 200 | الموداليتيز حية |
| `GET /radiology/bookings/mine` | 401 | حجز المريض محمي |
| `GET /home-care/services` | 401 | العقد محمي؛ يحتاج Sandbox |
| `GET /home-care/providers` | 401 | العقد محمي؛ يحتاج Sandbox |
| `GET /home-care/bookings/my` | 401 | العقد محمي؛ يحتاج Sandbox |
| `GET /nursing/visits` | 401 | العقد محمي؛ يحتاج Sandbox |
| `GET /orders/mine` | 401 | ملكية المريض مطلوبة |
| `GET /orders/{id}` | 401 | ملكية المريض مطلوبة |
| `GET /orders/{id}/tracking` | 401 | ملكية المريض مطلوبة |
| `GET /medicines/filters` | 200 | فلاتر الكتالوج حية |
| `GET /medicines/compare` | 404 | لا يُعتمد كـGET؛ يجب التحقق بالـmethod المنشور قبل التنفيذ |
| `GET /users/me/wishlist` | 401 | ملكية المريض مطلوبة |
| `GET /cart` | 401 | السلة محمية |
| `GET /cart/lines` | 404 | لا يُنشأ GET غير مثبت؛ mutation يحتاج عقده الصحيح |
| `GET /prescriptions/mine` | 401 | ملكية المريض مطلوبة |

الدليل الخام محفوظ في `phase4-live-probe.tsv`، والجرد في `phase4-domain-inventory.txt`.

## نتيجة المقارنة المهمة

Mobile `diagnostics/package-detail.tsx` يضيف الحزمة إلى `DiagnosticsCartContext` المحلي، ويحسب عناصر/الإجماليات محلياً؛ الملف لا يقدم adapter موثقاً لسلة backend. في Web، صفحة package detail الحالية قراءة فقط، و`/cart` يعتمد على سلة backend محمية، بينما allowlist العامة لا تسمح بإضافة cart lines mutation.

لذلك لا يجوز نسخ زر Mobile إلى Web على أنه checkout حقيقي قبل إثبات عقد diagnostics cart. القرار الصادق هو:

> **Package detail read: Done ضمن عقد GET. Add-to-diagnostics-cart: Partial/Deferred حتى يثبت contract واضح للسلة والـcheckout، أو يُعتمد رسمياً تنفيذ local cart غير مالي مع رحلة لاحقة متعاقدة.**

هذا ليس mock data؛ بل فرق معماري بين local state في Mobile وسلة server-authoritative في Web. لا تُعرض أسعار أو نجاح شراء مصطنعة.

## الفجوات التنفيذية المتبقية في Phase 4

تحتاج Diagnostics إلى package/test detail، book sample، booking confirmation/success، tracking، results/history، insurance approval/upload، وreport access مع owner isolation. تحتاج Home-care/Nursing إلى provider/visit reads، booking/tracking، cancel/reschedule، وبيانات العنوان/الموافقة. تحتاج Pharmacy/Orders إلى wishlist، compare، cart mutations، checkout، prescription/OCR/upload، order approval/rejection، reorder/partial reorder، returns، broadcast bids، pharmacist chat، وtracking transitions.

كل واحدة ستبدأ بضربة حية method/path دون جلسة. إذا أعادت 401/403 نتحقق بعدها بحساب Sandbox؛ إذا أعادت 404 فلا ننشئ route حتى يثبت backend contract مختلف. بعد التنفيذ تُضاف اختبارات owner/stranger/unauth وreplay حيث ينطبق، ثم visual/UX states وfull gates.

## القرار

**Phase 4 inventory and risk review: PASS.**  
**Phase 4 full feature closure: OPEN.** لا يجوز وصف Diagnostics/Home-care/Pharmacy/Orders بأنها مطابقة كاملة حتى تُغلق الفجوات أعلاه، خصوصاً رحلة الحجز/الشراء من البداية للنهاية.
