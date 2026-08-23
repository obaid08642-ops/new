# Phase 5 — Health/Profile/Insurance/Reports/Family/Chat/Notifications

## نتيجة التحقق الحي

تمت تجربة مسارات القراءة دون جلسة وببيانات لا تكشف حساباً. كل المسارات المملوكة أعادت 401، وهو دليل أن route موجود ومحمي، بينما المسار القديم `/notifications/mine` أعاد 404. Web wrapper يستخدم `/notifications` الصحيح، لذلك لا يوجد اعتماد على المسار القديم.

| المجال | المسارات الأساسية | النتيجة دون جلسة |
|---|---|---:|
| Profile | `/users/me/profile`, `/users/me/insurance` | 401 |
| Privacy/Security | `/users/me/privacy-settings`, `/users/me/security-settings`, `/users/me/sessions` | 401 |
| Health | `/health/score`, `/health/reports`, `/health/vitals?limit=100`, `/health/sleep?limit=100`, `/health/trends` | 401 |
| Medical | `/health/emergency-contacts`, `/health/chronic-diseases`, `/health/chronic-meds` | 401 |
| Family | `/family/my-group` | 401 |
| Insurance | `/insurance/my-policy`, `/insurance/benefits-summary`, `/insurance/claims` | 401 |
| Chat | `/chat/threads` | 401 |
| Notifications | `/notifications` | 401 |
| Notifications legacy candidate | `/notifications/mine` | 404 |
| Bookmarks | `/articles/bookmarks/mine` | 401 |
| Mental health | `/mental-health/dashboard`, `/mental-health/crisis-contacts`, `/mental-health/breathing`, `/mental-health/mood?days=30` | 401 |

الدليل الخام محفوظ في `phase5-live-probe.tsv`، والجرد في `phase5-domain-inventory.txt`.

## قراءة parity

Web يملك صفحات قراءة لعدد من هذه المجالات وserver wrappers وparsers محدودة. أما Mobile فيحتوي subflows إضافية كثيرة، خصوصاً تعديل الملف، permissions والأسرة، إنشاء القياسات والتذكيرات، رسائل Chat، الإشعارات ذات الإجراءات، مطالبات التأمين، والوظائف الصحية الحساسة. لا تعتبر هذه التدفقات مكتملة بمجرد وجود صفحة قراءة.

تحتاج كل mutation إلى method/path حي، DTO مضبوط، httpOnly/BFF boundary، owner/stranger/unauth، idempotency عند الإنشاء أو الدفع، وحالات optimistic failure صادقة. لا تُفعّل أي كتابة من المتصفح عبر allowlist القراءة العامة.

## قرار المرحلة

**Contract discovery: PASS.**  
**Read surfaces: partially implemented and covered by existing tests.**  
**Full Mobile parity: OPEN.**  
الـSandbox owner/stranger والـmutation flows ما زالت مؤجلة حتى توفير الحسابات الرسمية؛ لا يتم استخدام بيانات حقيقية أو mock production data.
