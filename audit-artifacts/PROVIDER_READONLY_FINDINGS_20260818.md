# Provider readonly findings

استخدمت القراءة الآمنة فقط. التطبيق يعرّف فعلياً `POST /provider/auth/login` ويرسل `{ email, password, meta.device_identifier }`، لذلك كان المسار المستخدم مطابقاً لمصدر Provider App. أعاد probe الحالي 404 للدكتور والمختبر والأشعة، و429 للصيدلية والتمريض والمستشفى مع `retry_after`. لا يجوز تفسير 404 على أنه route missing قبل قراءة body/message وتمييز `account_not_found` عن route error، ولا يجوز إعادة محاولة الحسابات ذات 429 قبل انتهاء نافذة المعدل.

لم تُنفذ أي queue/accept/reject/toggle أو mutation. الخطوة التالية بعد انتهاء rate-limit هي إعادة login لحساب واحد في كل مرة، ثم قراءة `provider-onboarding/my-profile` و`progress` وnotifications وwallet، ثم exact queue/inbox route من controller. كل اختبار سيستخدم حساب sandbox فقط.
