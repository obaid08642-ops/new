# Phase 7 — Health Score Contract Decision

يثبت Backend `GET /health/score` ويحسب score من vitals/profile/sleep الأسبوعي. الـservice يصرح أن score يصبح `null` مع `insufficient_data` إذا لم توجد مكونات كافية، ولا يستخدم بيانات guessed. لأن response يحتوي recommendations نصية سريرية، لن يعرض Web recommendations في أول slice؛ سيعرض فقط score/status ومكونات محدودة إذا اجتاز parser allowlist. هذا يحافظ على truthful behavior ويمنع تحويل نص backend إلى diagnosis أو treatment advice.

المسار يحتاج BFF GET allowlist وserver-only session وSSR privacy test. لا تفتح أي POST/PATCH/DELETE في هذه المرحلة.
