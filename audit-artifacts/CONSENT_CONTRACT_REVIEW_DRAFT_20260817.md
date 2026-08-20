# Nabdah Consent Contract — Review Draft

**الحالة:** مسودة مراجعة فقط — غير مفعّلة

**الغرض:** تعريف عقد أولي للموافقة الصحية قبل أي تفعيل في الواجهات أو المسارات الطبية. هذه الوثيقة لا تمنح أي صلاحية بذاتها، ولا تغيّر سلوك الإنتاج. أي endpoint غير معتمد يجب أن يبقى غير موجود أو يعيد رفضاً fail-closed.

## مبادئ الحماية

يجب أن تكون الموافقة محددة الغرض، محددة النطاق، قابلة للسحب بسهولة، قابلة للتدقيق، ومحدودة زمنياً عند الحاجة. غياب الموافقة، غموض scope، أو اختلاف owner/subject يؤدي إلى الرفض. لا يجوز اعتبار تسجيل الدخول أو حجز الموعد موافقة ضمنية على مشاركة بيانات صحية حساسة.

## النموذج المقترح

| الحقل | النوع | القاعدة المحافظة |
|---|---|---|
| `id` | UUID | معرف سجل الموافقة، لا يُعاد استخدامه |
| `subject_id` | UUID | صاحب البيانات الصحية |
| `actor_id` | UUID | من منح أو سحب الموافقة؛ يجب أن يكون subject أو مفوضاً مثبتاً |
| `actor_role` | enum | patient، guardian، provider، admin، system؛ لا تكفي القيمة وحدها دون authorization |
| `scope` | enum[] | قائمة مغلقة من scopes معتمدة؛ أي scope مجهول يرفض الطلب كله |
| `purpose` | enum | غرض محدد، لا free text يؤثر في authorization |
| `status` | enum | `granted` أو `revoked` أو `expired` |
| `version` | string | إصدار العقد أو نص الموافقة الذي قُبل |
| `granted_at` | UTC timestamp | وقت المنح |
| `expires_at` | UTC timestamp/null | الانتهاء مطلوب للـscopes المؤقتة، وnull لا يعني صلاحية غير محدودة إلا بعد اعتماد صريح |
| `revoked_at` | UTC timestamp/null | وقت السحب |
| `source` | enum | patient_app، provider_app، admin، api |
| `evidence` | object | metadata غير حساسة: request id، device/app version، policy version |
| `created_at/updated_at` | UTC timestamps | immutable event lineage |

## Scopes الأولية المقترحة

لا تُعتبر هذه القائمة مفعّلة. المقترح الأولي هو `care:read` لقراءة بيانات مرتبطة برعاية محددة، `care:write` لإضافة ملاحظات ضمن appointment مصرح، `documents:read` لقراءة وثائق محددة، `location:share:emergency` لمشاركة موقع طوارئ ضمن حادثة واحدة، و`notifications:receive` لإرسال إشعارات تشغيلية. لا يُقترح scope عام مثل `health:*`.

كل scope يجب أن يرتبط بـ`purpose` وsubject وresource عند الحاجة، وأن يُقيّم على كل request. لا يكفي وجود سجل `granted` إذا انتهى الزمن أو سُحب scope أو تغيرت علاقة actor بالموعد.

## العمليات غير المفعلة

| العملية المقترحة | السلوك عند عدم الاعتماد |
|---|---|
| `grant` | غير منشورة؛ أي استدعاء غير معروف يعيد `CONSENT_CONTRACT_NOT_ACTIVE` |
| `revoke` | غير منشورة؛ لا يوجد سحب وهمي أو حذف صامت للسجل |
| `check` | لا تمنح bypass؛ المسارات الحالية تعتمد authorization القائم حتى اعتماد العقد |
| `list/audit` | غير منشورة للمستخدمين؛ لا تعرض بيانات صحية أو سجل موافقات قبل اعتماد privacy model |

## قواعد grant

يجب رفض grant إذا كان `subject_id` مفقوداً، أو scope غير موجود في registry، أو purpose غير معتمد، أو actor غير مفوض، أو version غير معروف، أو expiry غير صالح. يجب أن يكون grant idempotent حسب key لا يعيد إنشاء صلاحيات متكررة، مع حفظ event منفصل لكل محاولة مقبولة أو مرفوضة.

## قواعد revoke

السحب أسهل من المنح: يستطيع subject سحب موافقته دون اشتراط موافقة المزود. revoke لا يحذف السجل؛ ينشئ حدثاً immutable ويجعل الحالة الحالية `revoked`. يجب أن تُبطل cache وtokens المشتقة من consent ضمن حد زمني محدد في العقد النهائي.

## Audit trail

كل grant أو revoke أو رفض authorization يسجل `event_id`, `consent_id`, `subject_id`, `actor_id`, `action`, `scope`, `purpose`, `result`, `reason_code`, `request_id`, `ip_hash` أو بديله المعتمد، `user_agent_hash`، timestamps، وpolicy/version. لا يُخزن access token أو محتوى صحي في audit event. يجب منع تعديل أو حذف audit events من مسارات المستخدمين.

## Fail-closed acceptance criteria

لا تُفعّل الواجهة قبل اعتماد هذه الوثيقة من Gatekeeper تقنياً ومن المالك قانونياً/منتجياً. قبل التفعيل يجب اختبار actor غير المفوض، scope غير معروف، grant مكرر، revoke فوري، انتهاء الصلاحية، تغير appointment، محاولة cross-subject، وقراءة audit دون صلاحية.

**قرار المراجعة:** DRAFT — NOT ACTIVE — لا تغييرات تشغيلية.
