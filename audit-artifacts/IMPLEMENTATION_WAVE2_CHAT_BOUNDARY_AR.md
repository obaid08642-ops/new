# Wave 2 — Chat Boundary Audit

## الحالة الحالية

Web Chat يعرض thread metadata محدودًا: النوع وآخر نشاط فقط، من خلال server-only patient boundary. لا تظهر أسماء المشاركين، معاينات الرسائل، المرفقات، أو payload links.

## سبب عدم توسيع parity

شاشات الموبايل تشمل doctor chat وfamily chat وpharmacist chat وsupport chat وAI chat. فتحها أو إرسال رسالة يتطلب عقودًا مختلفة للـroom ownership، participant authorization، realtime transport، attachment protection، read/delivery state، وretention/privacy.

## القرار الأمني

بقيت Chat في Web read-only. لم تتم إضافة open-thread route أو send/read mutations أو fallback content. أي توسيع لاحق يجب أن يثبت contract مستقلًا لكل نوع محادثة مع اختبارات authorization وno-token-in-browser.
