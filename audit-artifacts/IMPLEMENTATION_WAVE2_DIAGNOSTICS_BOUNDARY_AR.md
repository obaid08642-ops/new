# Wave 2 — Diagnostics Boundary Audit

## النتيجة

الموبايل يملك Hub واسعًا يشمل المختبرات والأشعة والبحث والمرشحات واختيار home/clinic والعنوان والتأمين والباقات والخدمات والسلة والدفع وتتبع العينات والنتائج. Web الحالي يثبت فقط قراءة حجوزات labs وradiology عبر server-only boundaries وعرض الحالات empty/error/forbidden والتفاصيل.

## ما يمكن اعتباره مطابقًا

- فصل labs وradiology في العرض.
- قراءة الحجوزات الحالية من عقدي bookings.
- حالات 401/403/404/error/empty.
- رابط تفاصيل booking الموجود فعليًا.

## ما تم حظره عمدًا

لم أضف البحث أو الأسعار أو cart أو checkout أو insurance upload أو sample tracking أو result mutations. هذه الأفعال ظاهرة في الموبايل، لكنها تحتاج request/response schemas، ملكية للمريض، صلاحيات، حماية ملفات، وتحققًا من حالات الانتقال والدفع. وجود route أو `apiFetch` في الموبايل لا يثبت عقدًا آمنًا صالحًا للويب.

## قرار المرحلة

Diagnostics parity التنفيذية **مفتوحة/غير مغلقة**. لن أضع placeholder أو بيانات ثابتة لإظهار اكتمالها؛ ستبقى ضمن قائمة Wave 2 blocked contracts حتى تثبت العقود.
